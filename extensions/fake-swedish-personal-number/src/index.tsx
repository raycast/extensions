import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { generatePNItem } from "./utils";
import { useMemo } from "react";
import { randomInt } from "crypto";

export default function Command() {
  const list = useMemo(() => {
    return [
      generatePNItem(randomInt(18, 99), "male"),
      generatePNItem(randomInt(18, 99), "female"),
      generatePNItem(randomInt(0, 18), "male"),
      generatePNItem(randomInt(0, 18), "female"),
    ];
  }, []);

  return (
    <List>
      {list.map((item) => (
        <List.Item
          key={item.pn}
          icon={Icon.Person}
          title={item.pn}
          subtitle={`${item.age} years, ${item.gender}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.pn} />
              <Action.Paste content={item.pn} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
