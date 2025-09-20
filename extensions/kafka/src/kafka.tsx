import { Action, ActionPanel, Icon, List } from "@raycast/api";
import KafkaTopics from "./components/topics";
import KafkaConsumers from "./components/consumers";

export default function Kafka() {
  return (
    <List>
      {[
        { type: "Topics", icon: Icon.List, to: <KafkaTopics /> },
        { type: "Consumers", icon: Icon.PersonLines, to: <KafkaConsumers /> },
      ].map(({ type, icon, to }) => (
        <List.Item
          key={type}
          title={type}
          icon={icon}
          actions={
            <ActionPanel>
              <Action.Push icon={icon} title={"Go to " + type} target={to} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
