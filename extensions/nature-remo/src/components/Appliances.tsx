import { List } from "@raycast/api";
import { Appliance } from "nature-remo";
import { useAppliances } from "../lib/api";
import { AC } from "./Aircon";
import { IR } from "./Signals";

export function Appliances() {
  const { isLoading, appliances } = useAppliances();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Appliances...">
      <List.Section title="Appliances" subtitle={String(appliances.length)}>
        {appliances.map((app) => (
          <Item key={app.id} appliance={app} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ appliance }: { appliance: Appliance }) {
  switch (appliance.type) {
    case "AC":
      return <AC appliance={appliance} />;
    case "IR":
      return <IR appliance={appliance} />;
    default:
      console.log(`Unrecognized appliance type: ${appliance.type}`);

      return <IR appliance={appliance} />;
  }
}
