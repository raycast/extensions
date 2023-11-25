import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { scrapeMacUpdater, Update } from "./scrape";
import { UpdateListItem } from "./UpdateListItem";

export default function Command() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    scrapeMacUpdater(`https://macupdater.net/app_updates/top-1000-mac-apps.html`, 1)
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
      {updates.map((update, index) => (
        <UpdateListItem key={index} update={update} />
      ))}
    </List>
  );
}
