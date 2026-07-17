import { Action } from "@raycast/api";
import { VULTR_ICON } from "../constants";

export default function OpenInVultr({ url }: { url: string }) {
  return <Action.OpenInBrowser icon={VULTR_ICON} title="Open in Vultr" url={url} />;
}
