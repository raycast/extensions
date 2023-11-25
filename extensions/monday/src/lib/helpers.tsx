import { Detail, environment } from "@raycast/api";
import { resolve } from "path";

export function ErrorView({ error }: { error: string }) {
  let errorMarkdown = "# Uh oh!\n";
  errorMarkdown += `![Error message](file://${resolve(
    environment.assetsPath,
    "error.png"
  )})\n`;
  errorMarkdown += "## " + error;
  return <Detail markdown={errorMarkdown} />;
}
