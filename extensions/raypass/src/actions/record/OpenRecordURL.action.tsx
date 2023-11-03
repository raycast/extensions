import { Action } from "@raycast/api";

interface Props {
  url: string;
}

export const OpenRecordURL: React.FC<Props> = ({ url }) => (
  <Action.OpenInBrowser title="Open URL" url={url} shortcut={{ modifiers: ["cmd", "shift"], key: "w" }} />
);
