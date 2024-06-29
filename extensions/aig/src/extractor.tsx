import { BrowserExtension } from "@raycast/api";

export default async function Command() {
  const markdown = await BrowserExtension.getContent({ format: "markdown" });
  console.log(markdown);
}
