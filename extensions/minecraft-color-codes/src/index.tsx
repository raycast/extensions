import { Icon, List, getPreferenceValues } from "@raycast/api";
import { generateActionPanel } from "./components/actionpanel";
import { COLORS, FORMATTING } from "./constants";
import { escapeChar } from "./utils";

import { useCachedState } from "@raycast/utils";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  const [prefix, setPrefix] = useCachedState<string>("prefix", prefs.prefix1);
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
