import { ActionPanel, Action, List, Icon } from "@raycast/api";

const MAPS = [
  {
    id: "dam",
    name: "Dam Battlegrounds",
    description: "The original map - flooded industrial zone",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/dam.webp",
  },
  {
    id: "spaceport",
    name: "The Spaceport",
    description: "Abandoned launch facility with vertical gameplay",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/spaceport.webp",
  },
  {
    id: "buried-city",
    name: "Buried City",
    description: "Underground ruins and collapsed structures",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/buried-city.webp",
  },
  {
    id: "blue-gate",
    name: "Blue Gate",
    description: "Coastal area with research facilities",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/blue-gate.webp",
  },
  {
    id: "stella-montis",
    name: "Stella Montis",
    description: "Mountain region added in 1.4.0 update",
    icon: "https://cdn.metaforge.app/arc-raiders/custom/stella-montis.webp",
  },
];

export default function OpenMap() {
  return (
    <List searchBarPlaceholder="Select a map to open...">
      {MAPS.map((map) => (
        <List.Item
          key={map.id}
          icon={{ source: map.icon, fallback: Icon.Map }}
          title={map.name}
          subtitle={map.description}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Interactive Map"
                url={`https://metaforge.app/arc-raiders/map/${map.id}`}
              />
              <Action.CopyToClipboard
                title="Copy Map URL"
                content={`https://metaforge.app/arc-raiders/map/${map.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
