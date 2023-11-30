import { showHUD, Clipboard } from "@raycast/api";
import { LaunchProps } from "@raycast/api";
import path from "path";
import fs from "fs";

export default async function main(props: LaunchProps) {
  const { filename } = props.arguments;
  console.log(`filename: ${filename}`);

  const content = await Clipboard.readText();

  if (!content) {
    return;
  }

  if (!fs.existsSync(`/tmp/clipboard-to-file/`)) {
    fs.mkdirSync(`/tmp/clipboard-to-file/`);
  }

  const p = path.resolve(`/tmp/clipboard-to-file/`, filename);

  fs.writeFileSync(p, content);

  try {
    const fileContent: Clipboard.Content = { file: p };
    await Clipboard.copy(fileContent);
  } catch (error) {
    console.log(`Could not copy file '${p}'. Reason: ${error}`);
  }

  await showHUD(`Copied to file: ${p}, success`);
}
