import { List } from "@raycast/api";
import { scrapeMacUpdater } from "./scrape";
import { UpdateListItem } from "./UpdateListItem";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data: updates } = useCachedPromise(
    async () => scrapeMacUpdater(`https://macupdater.net/app_updates/top-1000-mac-apps.html`, 1),
    [],
    {
      initialData: [],
    }
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by title...">
      {updates.map((update, index) => (
        <UpdateListItem key={index} update={update} />
      ))}
    </List>
  );
}
