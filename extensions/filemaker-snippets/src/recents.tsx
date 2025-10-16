import { List } from "@raycast/api";
import { useFileMakerPrefs } from "./helpers";
import { DisplayFile } from "./displayFile";
import { useFrecencySorting } from "@raycast/utils";

export default function Command() {
  const { data, isLoading } = useFileMakerPrefs();
  const { data: recentFiles, resetRanking, visitItem } = useFrecencySorting(data?.recentFiles ?? []);
  return (
    <List isLoading={isLoading}>
      {recentFiles
        .filter((o) => (o.local ? o.exists : true))
        .map((item) => (
          <DisplayFile file={item} resetRanking={resetRanking} visitItem={visitItem} />
        ))}
    </List>
  );
}
