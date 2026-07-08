import { closeMainWindow, LaunchProps, open, showHUD } from "@raycast/api";
import { searchUrl } from "./lib/urls";

export default async function Command(props: LaunchProps<{ arguments: { query: string } }>) {
  const query = props.arguments.query.trim();
  await closeMainWindow();
  await open(searchUrl(query));
  await showHUD(`Searching Wavedash for “${query}”`);
}
