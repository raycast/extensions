import { open, showInFinder, showToast, Toast } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { homedir } from "os";

export async function downloadFile(url: string, filename: string) {
  const toast = await showToast(Toast.Style.Animated, "Downloading file...");

  try {
    const downloadsPath = homedir() + "/Downloads";
    const filePath = `${downloadsPath}/${filename}`;

    console.log(url);
    console.log(filePath);

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });
    // const w = response.data.pipe(fs.createWriteStream(filePath));

    // w.on("finish", () => {
    //   console.log("Successfully downloaded file!");
    // });
    // showInFinder(filePath);
  } catch (err) {
    console.log("error");
    // console.error(err);
  }
}

export const axiosGetImageArrayBuffer = async (url: string) => {
  const res = await axios({
    url: url,
    method: "GET",
    responseType: "arraybuffer",
  });

  return res.data;
};

export function extractHostname(url: string) {
  let hostname;

  // find and remove protocol (http, ftp, etc.) and get hostname
  if (url.indexOf("//") > -1) {
    hostname = url.split("/")[2];
  } else {
    hostname = url.split("/")[0];
  }

  // find and remove port number
  hostname = hostname.split(":")[0];
  // find and remove "?"
  hostname = hostname.split("?")[0];

  return hostname;
}
