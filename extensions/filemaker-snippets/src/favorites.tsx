import { List } from "@raycast/api";
import { useFileMakerPrefs } from "./helpers";
import { DisplayFile } from "./displayFile";
import { useFrecencySorting } from "@raycast/utils";

export default function Command() {
  const { data, isLoading } = useFileMakerPrefs();
  const { data: favorites, resetRanking, visitItem } = useFrecencySorting(data?.favorites ?? []);
  return (
    <List isLoading={isLoading}>
      {favorites.map((item) => (
        <DisplayFile file={item} resetRanking={resetRanking} visitItem={visitItem} />
      ))}
    </List>
  );
}
