import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { recentPowerPointFiles } from "./lib/office";
import { PowerPointListItem } from "./components/pp/list";

export default function RecentPowerpointSlides() {
  const { data, isLoading } = useCachedPromise(async () => recentPowerPointFiles(), []);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Recent PowerPoint Slides...">
      {data?.files?.map((file) => (
        <PowerPointListItem key={file.filename} file={file} executable={data.pptExecutable} />
      ))}
    </List>
  );
}
