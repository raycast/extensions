import { Detail } from "@raycast/api";

export default function NotInstalledDetail() {
  const markdown = `
  Spotify is not installed or could not be found. Please install Spotify and try again.
    `;
  return <Detail markdown={markdown} />;
}
