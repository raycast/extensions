import { List } from "@raycast/api";
import { Launch } from "../types/launches";

export default function LaunchDetail({ launch }: { launch: Launch }) {
  const markdown = `
  ![${launch.name}](${launch.image})
  
  ${launch.mission?.description}
  `;

  return (
    <List.Item
      title={launch.name}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name " text={launch.name} />
              <List.Item.Detail.Metadata.Label title="Status 🚀" text={launch.status.abbrev} />
              <List.Item.Detail.Metadata.Label title="Window Start ⌛" text={launch.window_start} />
              <List.Item.Detail.Metadata.Label title="Window End ⌛" text={launch.window_end} />
              <List.Item.Detail.Metadata.Label title="Launch Agency 🏢" text={launch.launch_service_provider.name} />
              <List.Item.Detail.Metadata.Label title="Webcast Live 📸" text={launch.webcast_live ? "✅" : "❌"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
