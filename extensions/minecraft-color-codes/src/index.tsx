import { Cache, Icon, List, getPreferenceValues } from "@raycast/api";
import { generateActionPanel } from "./components/actionpanel";
import { COLORS, FORMATTING } from "./constants";
import { escapeChar } from "./utils";
import { useState } from "react";

const cache = new Cache({ capacity: 1 });
// Use a 1-byte cache to store the prefix character,
// idk where else to store it

if (!cache.has("prefix")) {
  cache.set("prefix", getPreferenceValues<Preferences>().prefix1);
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const [prefix, setPrefix] = useState(cache.get("prefix") || prefs.prefix1);
  const prefixEscaped = escapeChar(prefix);

  return (
    <List>
      <List.Section title="Colors">
        {COLORS.map(({ name, chatCode, hexCode, keywords }) => {
          const fullChatCode = `${prefix}${chatCode}`;
          const chatCodeEscaped = `${prefixEscaped}${chatCode}`;
          const formattedHexCode = prefs.hexUpperCase ? hexCode : hexCode.toLowerCase();

          return (
            <List.Item
              key={fullChatCode}
              icon={{ source: Icon.Contrast, tintColor: formattedHexCode }}
              title={name}
              subtitle={fullChatCode}
              keywords={keywords}
              actions={generateActionPanel({
                cache,
                setPrefix,

                chatCode: fullChatCode,
                chatCodeEscaped,
                hexCode: formattedHexCode,
              })}
            />
          );
        })}
      </List.Section>

      <List.Section title="Formatting">
        {FORMATTING.map(({ name, icon, chatCode }) => {
          const fullChatCode = `${prefix}${chatCode}`;
          const chatCodeEscaped = `${prefixEscaped}${chatCode}`;

          return (
            <List.Item
              key={fullChatCode}
              icon={icon}
              title={name}
              subtitle={fullChatCode}
              actions={generateActionPanel({
                cache,
                setPrefix,

                chatCode: fullChatCode,
                chatCodeEscaped,
              })}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
