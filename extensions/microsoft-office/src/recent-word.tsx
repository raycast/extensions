import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { recentWordFiles } from "./lib/office";
import { WordListItem } from "./components/word/list";

export default function RecentWordDocuments() {
  const { data, isLoading } = useCachedPromise(async () => recentWordFiles(), []);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Recent Word Documents...">
      {data?.files?.map((file) => (
        <WordListItem key={file.filename} file={file} executable={data.wordExecutable} />
      ))}
    </List>
  );
}
