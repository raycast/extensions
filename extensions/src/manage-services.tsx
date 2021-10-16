import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { createActions, createIcon, getServices, serviceType } from "./services";

export default function Command() {
  const [services, setServices] = useState<serviceType[]>();
  useEffect(() => {
    getServices().then((service) => setServices(service));
  });

  return (
    <List isLoading={!services} searchBarPlaceholder="Search for services...">
      {
        (services ?? []).map(d => (
          <List.Item
            id={d.name}
            key={d.name}
            title={d.name}
            subtitle={d.status}
            accessoryTitle={d.user}
            icon={createIcon(d.status)}
            actions={createActions(d)}
          />
        ))
      }
    </List>
  );
}
