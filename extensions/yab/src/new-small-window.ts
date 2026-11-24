import { LaunchProps } from "@raycast/api";
import { failed, openSmallWindow, searchUrl, toUrl } from "./yab";

export default async function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const text = props.arguments.url?.trim() ?? "";
  const target = text ? (toUrl(text) ?? searchUrl(text)) : undefined;
  await openSmallWindow(target).catch((e) => failed("Could not open a Small Window", e));
}
