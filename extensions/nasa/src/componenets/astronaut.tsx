import { List } from "@raycast/api";
import { Astronaut } from "../types/astronauts";
import { calculateTimeInSpace, formatTimeAgo } from "../utils/timeCalculator";
import { flag } from "country-emoji";

export default function AstronautDetail({ astronaut }: { astronaut: Astronaut }) {
  const markdown = `
  ![${astronaut.name}](${astronaut.profile_image_thumbnail})
  
  ${astronaut.bio}
  `;

  return (
    <List.Item
      title={astronaut.name + " " + (flag(astronaut.nationality) || "🌍")}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name 👱" text={astronaut.name} />
              <List.Item.Detail.Metadata.Label
                title="Time in space 🌌"
                text={calculateTimeInSpace(astronaut.time_in_space)}
              />
              <List.Item.Detail.Metadata.Label
                title="Age 👨‍🦳"
                text={astronaut.age + " years old - " + astronaut.date_of_birth}
              />
              <List.Item.Detail.Metadata.Label title="Nationality 🌍" text={astronaut.nationality} />
              <List.Item.Detail.Metadata.Label title="Agency 🤝" text={astronaut.agency.name} />
              <List.Item.Detail.Metadata.Label title="Flights 🚀" text={astronaut.flights_count.toString()} />
              <List.Item.Detail.Metadata.Label title="Landings 🛬" text={astronaut.landings_count.toString()} />
              <List.Item.Detail.Metadata.Label title="Spacewalks 🚶‍♂️" text={astronaut.spacewalks_count.toString()} />
              <List.Item.Detail.Metadata.Label title="First Flight 🚀" text={formatTimeAgo(astronaut.first_flight)} />
              <List.Item.Detail.Metadata.Label title="Last Flight 🚀" text={formatTimeAgo(astronaut.last_flight)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
