import { useEffect, useState } from "react";
import { getServices, Service } from "./services";
import { List, Icon } from "@raycast/api";
import { BrewActions } from "./actions";
import { createIcon } from "./utils";

export default function Command() {
  const [services, setServices] = useState<Service[]>();

  useEffect(() => {
    getServices().then((service) => setServices(service));
  });

  return (
    <List isLoading={!services} searchBarPlaceholder="Search for services...">
      {(services ?? []).map((d) => (
        <List.Item
          title={d.name}
          subtitle={d.status}
          accessories={d.user ? [{ text: d.user, icon: Icon.Person }] : undefined}
          icon={createIcon(d.status)}
          actions={<BrewActions data={d} />}
        />
      ))}
    </List>
  );
}
