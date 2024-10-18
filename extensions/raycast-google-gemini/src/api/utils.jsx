import { Clipboard, Toast, showToast } from "@raycast/api";
import * as cheerio from "cheerio";
import { execSync } from "child_process";
import { assert } from "console";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import fs from "fs";
import isBinaryPath from "is-binary-path";
import path from "path";
import { setTimeout } from "timers";
import url from "url";

async function requestWithToast(closure, message, loading_banner, success_banner) {
  showToast({
    style: Toast.Style.Animated,
    title: loading_banner,
    message: message,
  });
  const result = await closure();
  showToast({
    style: Toast.Style.Success,
    title: success_banner,
  });
  return result;
}

export async function pathOrURLToImage(pathOrURL = "") {
  return await requestWithToast(
    async () => {
      const { fileUrl, filePath } = await parseLink(pathOrURL);
      var res = null;
      if (filePath) {
        res = await pathToGenerativePart(filePath, "image/png");
      } else {
        res = await urlToGenerativePart(fileUrl);
      }
      return {
        fileUrl,
        res,
      };
    },
    pathOrURL,
    "Preparing image...",
    "Image loaded.",
  );
}

async function parseLink(pathOrURL = "") {
  var fileUrl = "";
  var filePath = "";
  try {
    // from clipboard
    const { text, file } = await Clipboard.read();
    pathOrURL = pathOrURL || file || text;
    if (fs.existsSync(pathOrURL)) {
      assert(fs.lstatSync(pathOrURL).isFile());
      filePath = pathOrURL;
      fileUrl = url.pathToFileURL(filePath).href;
    } else {
      const parsedUrl = new URL(pathOrURL);
      fileUrl = parsedUrl.href;
      if (parsedUrl.protocol == "file:") {
        filePath = url.fileURLToPath(fileUrl);
        assert(fs.existsSync(filePath));
        assert(fs.lstatSync(filePath).isFile());
      } else if (!parsedUrl.protocol || !parsedUrl.host) {
        throw new Error("Invalid URL:" + parsedUrl.href);
      }
    }
  } catch (e) {
    console.error(e);
    throw new Error("The specified link or content in clipboard should be either a local file (path) or a hyper link.");
  }
  return {
    fileUrl,
    filePath,
  };
}

export async function rawHTMLByURL(url) {
  const rawHTML = await requestWithToast(
    async () => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
      }, 5000);
      const response = await fetch(url, { signal: controller.signal });
      return await response.text();
    },
    url,
    "Extracting context from the URL...",
    "Content extraction successful",
  );
  const $ = cheerio.load(rawHTML);
  return {
    href: url,
    title: $("title").text(),
    content: rawHTML,
  };
}

async function retrieveByUrl(fileManager, urlText = "") {
  const { fileUrl, filePath } = await parseLink(urlText);
  if (filePath !== "") {
    const isText = !isBinaryPath(filePath);
    if (isText) {
      return {
        href: filePath,
        title: path.basename(filePath),
        content: await pathToGenerativePart(filePath, "text/plain"),
      };
    }
    const fType = await fileTypeFromFile(filePath);
    const mime = fType.mime || "unknown";
    if (mime == "application/pdf") {
      const uploadResponse = await requestWithToast(
        async () => {
          return await fileManager.uploadFile(filePath, {
            mimeType: mime,
            displayName: path.basename(filePath),
          });
        },
        filePath,
        "Uploading PDF file ...",
        "PDF file upload successful",
      );
      return {
        href: filePath,
        title: path.basename(filePath),
        content: {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri,
          },
        },
      };
    } else {
      throw new Error(`FileType ${mime} is currently not supported in this mode.`);
    }
  }
  // default behavior for URL
  var rawHTMLObject = await rawHTMLByURL(fileUrl);
  rawHTMLObject.content = bufferToGenerativePart(rawHTMLObject.content, "text/html");
  return rawHTMLByURL;
}

export const retrievalTypes = {
  None: 0,
  URL: 1,
  Google: 2,
  Function: 3,
};

export async function GoogleSearch(searchQuery, searchApiKey = "", searchEngineID = "", topN = 10) {
  if (searchApiKey == "") {
    throw new Error("You have to provide Google search API and search engine ID to use this feature.");
  }
  const googleSearchUrl = "https://www.googleapis.com/customsearch/v1?";
  const params = {
    key: searchApiKey,
    cx: searchEngineID,
    q: searchQuery,
  };
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, 5000);
  const json = await requestWithToast(
    async () => {
      const response = await fetch(googleSearchUrl + new URLSearchParams(params), { signal: controller.signal });
      return await response.json();
    },
    "query: " + searchQuery,
    "Google Searching",
    "Got google top results",
  );
  if (!json || !json.items) {
    return [];
  }
  return json.items.slice(0, topN).map((item) => {
    return {
      href: item.link,
      title: item.title,
      content: item.snippet,
    };
  });
}

export async function getRetrieval(
  fileManager,
  searchQuery,
  retrievalType,
  searchApiKey = "",
  searchEngineID = "",
  URL = "",
  topN = 10,
) {
  var retrievalObjects = [];
  if (retrievalType == retrievalTypes.URL) {
    const retrievalObject = await retrieveByUrl(fileManager, URL);
    if (retrievalObject) retrievalObjects.push(retrievalObject);
  } else if (retrievalType == retrievalTypes.Google) {
    retrievalObjects = await GoogleSearch(searchQuery, searchApiKey, searchEngineID, topN);
  }
  return retrievalObjects;
}

export function executeShellCommand(command) {
  try {
    const result = execSync(command, { encoding: "utf-8" });
    return result.trim();
  } catch (error) {
    console.error(`Error executing shell command: ${error}`);
    return "";
  }
}

function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType,
    },
  };
}

// Converts local file information to a GoogleGenerativeAI.Part object.
async function pathToGenerativePart(path, mimeType) {
  return bufferToGenerativePart(await fs.promises.readFile(path), mimeType);
}

async function urlToGenerativePart(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const fileType = await fileTypeFromBuffer(arrayBuffer);
    const mimeType = fileType.mime;
    return bufferToGenerativePart(arrayBuffer, mimeType);
  } catch (e) {
    throw new Error("Image download failed: " + e.message);
  }
}
