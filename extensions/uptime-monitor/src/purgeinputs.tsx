import fs from "fs";
import path from "path";
import { Detail, environment } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown={`# User-Initiated Deletion of Monitored Websites

Hey there 👋🏻, we would like to inform you that all of your added Moniters have been deleted. Your data is stored locally, which means that we do not have access to it. Therefore, we are unable to recover any deleted data.

Here are some cool stats we think you would love ❤️:

    - Coming Soon
      
If you have any questions or concerns, please do not hesitate to contact us on slack.`}
    />
  );
}

const filePath = path.join(environment.supportPath, `inputs.txt`);

fs.unlink(filePath, (err) => err && console.error(err));
