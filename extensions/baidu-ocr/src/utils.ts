import { getPreferenceValues, showHUD } from "@raycast/api";
import request = require("request");
import fs = require("fs");

interface Preferences {
  baiduOCRAPIKey: string;
  baiduOCRSecretKey: string;
}

async function recognizeText(filepath: string): Promise<string> {
  const options = {
    method: "POST",
    url: "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=" + (await getAccessToken()),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    form: {
      image: getFileContentAsBase64(filepath),
    },
  };

  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        showHUD("❌ API Key Error!");
        reject("");
      } else {
        // console.log("ok");
        resolve(
          JSON.parse(response.body)
            .words_result.map((item: { words: string }) => item.words)
            .join("\n")
        );
      }
    });
  });
}

function getAccessToken() {
  const preferences = getPreferenceValues<Preferences>();
  const AK = preferences.baiduOCRAPIKey;
  const SK = preferences.baiduOCRSecretKey;
  const options = {
    method: "POST",
    url:
      "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=" + AK + "&client_secret=" + SK,
  };
  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(response.body).access_token);
      }
    });
  });
}

function getFileContentAsBase64(path: string) {
  try {
    // console.log(path);
    return fs.readFileSync(decodeURI(path), { encoding: "base64" });
  } catch (err) {
    showHUD("❌ File Not Found!");
    return null;
  }
}

export { recognizeText };
