import { List } from "@raycast/api";
import { scrapeMacUpdater } from "./scrape";
import { UpdateListItem } from "./UpdateListItem";
import { subDays, format } from "date-fns";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const [date] = useState(format(subDays(new Date(), 1), "yyyy-MM-dd"));
  const { isLoading, data: updates } = useCachedPromise(
    async () => scrapeMacUpdater(`https://macupdater.net/app_updates/index-${date}.html`),
    [],
    {
      initialData: [],
    }
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by title...">
      {updates.map((update) => (
        <UpdateListItem key={update.name + update.version} update={update} />
      ))}
    </List>
  );
}
