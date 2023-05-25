import { environment, updateCommandMetadata } from "@raycast/api";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";

type Url = {
  url: string;
  displayName: string;
};

async function getUrls(): Promise<Url[]> {
  const filePath = path.join(environment.supportPath, `inputs.txt`);

  let content = "";
  try {
    content = await fs.promises.readFile(filePath, "utf-8");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      fs.writeFileSync(filePath, "", "utf8");
    } else {
      throw err;
    }
  }

  return content.split("\n").map((urlStr) => {
    const [url, displayName] = urlStr.split(",");
    return {
      url: url.trim(),
      displayName: displayName.trim(),
    };
  });
}

async function writeStatus(url: string, displayName: string, status: string, time: number, filePath: string) {
  try {
    // Write to file
    const timestamp = Date.now(); // Get the current UNIX timestamp
    const data = `${timestamp}, ${displayName}, ${time}, ${url}\n`; // Format the data to log
    fs.appendFileSync(filePath, data, "utf8"); // Append the data to the file
  } catch (err: any) {
    if (err.code === "ENOENT") {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, "", "utf8");
    } else {
      throw err;
    }
  }
}

async function monitorUptime(url: string, displayName: string) {
  const fileName = url.replace(/\//g, "-");
  const filePath = path.join(environment.supportPath, `data/https:/${fileName}.txt`);

  try {
    const start = Date.now();
    const response = await fetch(url);
    const end = Date.now();
    const time = end - start;
    await writeStatus(url, displayName, response.status.toString(), time, filePath);
  } catch (error: any) {
    await writeStatus(url, displayName, error.message, 0, filePath);
  }
}

export default async function Command() {
  const filePath = path.join(environment.supportPath, `inputs.txt`);
  if (!fs.existsSync(filePath)) {
    await updateCommandMetadata({ subtitle: `Please add a monitor First` });
    return;
  }
  const urls = await getUrls();
  if (urls.length === 0) {
    await updateCommandMetadata({ subtitle: `Please Add A Monitor First` });
    return;
  }
  await Promise.all(urls.map((url) => monitorUptime(url.url, url.displayName)));
  await updateCommandMetadata({ subtitle: `Monitored ${urls.length} URLs` });
}
