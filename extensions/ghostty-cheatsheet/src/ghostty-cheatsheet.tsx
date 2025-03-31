import { List } from "@raycast/api";
import shortcuts from "./shortcuts";

export default function Command() {
  const platform: NodeJS.Platform = process.platform;
  const os = platform === "darwin" ? "macOS" : "Windows/Linux";

  return (
    <List>
      {Object.keys(shortcuts).map((key) => (
        <List.Section key={key} title={key}>
          {shortcuts[key]
            .filter((item) => item[os])
            .map((item) => (
              <List.Item key={item.action} title={item.action} subtitle={item[os]} />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
