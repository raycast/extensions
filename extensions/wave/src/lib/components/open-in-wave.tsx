import { Action } from "@raycast/api";

export default function OpenInWave({
  title = "Open in Wave",
  url = "https://www.waveapps.com/",
}: {
  title?: string;
  url?: string;
}) {
  return <Action.OpenInBrowser icon="wave.png" title={title} url={url} />;
}
