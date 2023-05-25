import fs from "fs";
import path from "path";
import { Detail, environment } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown={`# User-Initiated Deletion of Uptime Monitor Data

Hey there 👋🏻, we would like to inform you that all of your uptime monitor data has been deleted. Your uptime monitor data is stored locally, which means that we do not have access to it. Therefore, we are unable to recover any deleted data.

Here are some cool stats we think you would love ❤️:
    
    - ${size} bytes of monitor data have been removed.
    
If you have any questions or concerns, please do not hesitate to contact us on slack.`}
    />
  );
}

const directoryPath = path.join(environment.supportPath, `data/https:/`);

let size = 0; // initialize the size variable to 0

// Read all files in the directory
fs.readdir(directoryPath, async (err, files) => {
  if (err) {
    console.log("Error reading directory:", err);
    return;
  }

  // Loop through each file and delete it
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const stats = await fs.promises.stat(filePath); // get file stats
    size += stats.size; // add file size to the total size
    await fs.promises.unlink(filePath);
    console.log(`Deleted file ${file}`);
  }
});
