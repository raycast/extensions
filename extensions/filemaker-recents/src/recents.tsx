import { List } from "@raycast/api";
import { useFileMakerPrefs } from "./helpers";
import { DisplayFile } from "./displayFile";

export default function Command() {
  const { data, isLoading } = useFileMakerPrefs();
  return (
    <List isLoading={isLoading}>
      {data?.recentFiles
        .filter((o) => (o.local ? o.exists : true))
        .map((item, i) => <DisplayFile file={{ ...item, id: `${item.raw}-${i}` }} />)}
    </List>
  );
}
