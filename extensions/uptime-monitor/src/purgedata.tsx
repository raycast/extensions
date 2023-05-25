import fs from "fs";
import path from "path";
import { Detail, environment } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown={`# User-Initiated Deletion of Uptime Monitor Data

Hey there 👋🏻, we would like to inform you that all of your uptime monitor data has been deleted. Your uptime monitor data is stored locally, which means that we do not have access to it. Therefore, we are unable to recover any deleted data.

Here are some cool stats we think you would love ❤️:
    
    - Coming Soon
    
If you have any questions or concerns, please do not hesitate to contact us on slack.`}
    />
  );
}

const directoryPath = path.join(environment.supportPath, `data/https:/`);
fs.readdir(directoryPath, async (err, files) => {
  if (err) {
    console.log("Error reading directory:", err);
    return;
  }

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    await fs.promises.unlink(filePath);
    console.log(`Deleted file ${file}`);
  }
});
