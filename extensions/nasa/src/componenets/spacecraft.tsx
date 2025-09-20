import { List } from "@raycast/api";
import { SpaceCraft } from "../types/spacecrafts";
import { calculateTimeInSpace } from "../utils/timeCalculator";

export default function SpacecraftDetail({ spacecraft }: { spacecraft: SpaceCraft }) {
  const markdown = `
  ![${spacecraft.name}](${spacecraft.spacecraft_config.image_url})
  
  ${spacecraft.description}
  `;

  return (
    <List.Item
      title={spacecraft.name}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name " text={spacecraft.name} />
              <List.Item.Detail.Metadata.Label
                title="Time in space 🌌"
                text={calculateTimeInSpace(spacecraft.time_in_space)}
              />
              <List.Item.Detail.Metadata.Label title="Type 🚀" text={spacecraft.spacecraft_config.type.name} />
              <List.Item.Detail.Metadata.Label title="Agency 🤝" text={spacecraft.spacecraft_config.agency.name} />
              <List.Item.Detail.Metadata.Label title="Flights 🚀" text={spacecraft.flights_count.toString()} />
              <List.Item.Detail.Metadata.Label title="Landings 🛬" text={spacecraft.mission_ends_count.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
