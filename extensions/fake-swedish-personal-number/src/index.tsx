import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { generatePNItem } from "./utils";
import { useMemo } from "react";
import { randomInt } from "crypto";
import { PersonalNumberObject } from "./types";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [lastUsedPersonalNumberObjects, setLastUsedPersonalNumbers] = useCachedState<PersonalNumberObject[]>("faa", []);

  const list = useMemo(() => {
    const whenUsed = (foo: PersonalNumberObject) => setLastUsedPersonalNumbers((prev) => [foo, ...prev].slice(0, 15));
    return [
      generatePNItem(randomInt(18, 99), "male", whenUsed),
      generatePNItem(randomInt(18, 99), "female", whenUsed),
      generatePNItem(randomInt(0, 18), "male", whenUsed),
      generatePNItem(randomInt(0, 18), "female", whenUsed),
    ];
  }, [setLastUsedPersonalNumbers]);

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
              <Action.CopyToClipboard onCopy={item.onUse} content={item.pn} />
              <Action.Paste onPaste={item.onUse} content={item.pn} />
            </ActionPanel>
          }
        />
      ))}
      <List.Section title="Previously used">
        {lastUsedPersonalNumberObjects.map((item) => (
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
      </List.Section>
    </List>
  );
}
