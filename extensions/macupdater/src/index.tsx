import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { scrapeMacUpdater, Update } from "./scrape";
import { UpdateListItem } from "./UpdateListItem";
import { subDays, format } from "date-fns";

export default function Command() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const date = format(subDays(new Date(), 1), "yyyy-MM-dd");
    scrapeMacUpdater(`https://macupdater.net/app_updates/index-${date}.html`)
      .then((updates) => {
        setUpdates(updates);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by title...">
      {updates.map((update) => (
        <UpdateListItem key={update.name + update.version} update={update} />
      ))}
    </List>
  );
}
