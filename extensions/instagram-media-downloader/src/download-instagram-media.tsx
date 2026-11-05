import { LaunchProps } from "@raycast/api";
import { downloadFromLink } from "./download-link";

export default async function Command({
  arguments: { instagramUrl },
}: LaunchProps<{ arguments: Arguments.DownloadInstagramMedia }>) {
  await downloadFromLink(instagramUrl, "download-instagram-media");
}
