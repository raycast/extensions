import { showHUD } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";

interface Arguments {
  name: string;
}

export default async function Command(props: { arguments: Arguments }) {
  // Create contexts directory if it doesn't exist
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");
  if (!fs.existsSync(contextsDir)) {
    fs.mkdirSync(contextsDir, { recursive: true });
  }

  // Create empty context file with provided name
  const filePath = path.join(contextsDir, `${props.arguments.name}.txt`);
  fs.writeFileSync(filePath, "", "utf-8");

  console.log(`Created new context file at: ${filePath}`);

  await showHUD(`Created new context: ${props.arguments.name}`);
}
