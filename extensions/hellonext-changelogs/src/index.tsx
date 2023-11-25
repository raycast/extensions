import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Changelog, getChangelogs, hellonextApiKey } from "./utils/hellonext";
import ChangelogListItem from "./components/ChangelogListItem";
import axios from "axios";

export default function Command() {
  const [changelogs, setChangelogs] = useState<Changelog[]>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChangelogs = async () => {
      axios.defaults.headers.common["API-KEY"] = hellonextApiKey;
      const response = await getChangelogs();
      setChangelogs(response);
      setIsLoading(false);
    };
    fetchChangelogs();
  }, []);

  return (
    <List isLoading={isLoading}>
      {changelogs && changelogs?.length > 0 ? (
        changelogs.map((changelog) => <ChangelogListItem changelog={changelog} key={changelog.id} />)
      ) : (
        <List.EmptyView icon={{ source: "hn-logo-64.png" }} title="No changelogs found!" />
      )}
    </List>
  );
}
