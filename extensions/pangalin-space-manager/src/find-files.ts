import { LaunchProps, showToast, Toast } from "@raycast/api";
import { openInSpaceManager } from "./app";
import { links } from "./links";

export default async function Command(props: LaunchProps<{ arguments: Arguments.FindFiles }>) {
  const query = props.arguments.query.trim();
  if (!query) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Type what to look for",
      message: "For example: PDFs from last week",
    });
    return;
  }
  await openInSpaceManager(links.find(query));
}
