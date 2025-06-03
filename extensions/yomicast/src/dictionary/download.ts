import fs from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { environment, Toast } from "@raycast/api";
import { basename } from "node:path";
import AdmZip from "adm-zip";

type Release = {
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
};

export async function getLatestDictionaryUrl() {
  try {
    const latestRelease = "https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest";
    const releaseRes = await fetch(latestRelease);
    const releaseJson = (await releaseRes.json()) as Release;
    const enWithExamplesAsset = releaseJson.assets.find(
      (asset: { name: string }) => asset.name.startsWith("jmdict-examples-eng-") && asset.name.endsWith(".json.zip"),
    );
    if (!enWithExamplesAsset) {
      throw new Error("No suitable dictionary asset found in the latest release");
    }
    return enWithExamplesAsset.browser_download_url;
  } catch (error) {
    console.log("Failed to fetch latest dictionary:", error);
  }
}

export async function downloadFile(url: string, destination: string, toast: Toast, abortSignal: AbortSignal) {
  try {
    const res = await fetch(url, { signal: abortSignal });
    if (!res.body) throw new Error("Failed to fetch dictionary: No response body");

    const contentLength = res.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    let downloadedBytes = 0;

    console.log("Downloading to", destination);
    const fileStream = fs.createWriteStream(destination, { flags: "w" });
    const readableStream = Readable.fromWeb(res.body);

    // Handle cancellation
    abortSignal.addEventListener(
      "abort",
      () => {
        readableStream.destroy();
        fileStream.destroy();
      },
      { once: true },
    );

    readableStream.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
      toast.message = `Progress: ${progress}%`;
    });

    await finished(readableStream.pipe(fileStream));
    return destination;
  } catch (error) {
    if (abortSignal.aborted) {
      console.log("Download cancelled by user");
      return;
    }

    console.error("Error downloading dictionary:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to download dictionary";
    toast.message = "Please try again later.";
  }
}

export async function extractDictionary(zipPath: string, outputPath: string, toast: Toast, abortSignal: AbortSignal) {
  if (abortSignal.aborted) {
    console.log("Extraction cancelled by user");
    return;
  }

  try {
    console.log("Opening zip file:", zipPath);
    const zip = new AdmZip(zipPath);
    for (const entry of zip.getEntries()) {
      if (!entry.name.endsWith(".json")) continue;
      zip.extractEntryTo(entry.entryName, environment.supportPath, false, true, false, basename(outputPath));
      break;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to extract dictionary";
    toast.message = "Please try again later.";
    console.error("Error extracting dictionary:", error);
  }
}
