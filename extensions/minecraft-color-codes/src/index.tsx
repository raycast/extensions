import { Icon, List, getPreferenceValues } from "@raycast/api";
import { generateActionPanel } from "./components/actionpanel";
import { COLORS, ESCAPED_PREFIX, FORMATTING, PREFIX } from "./constants";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  return (
    <List>
      <List.Section title="Colors">
        {COLORS.map(({ name, chatCode, hexCode, keywords }) => {
          const fullChatCode = `${PREFIX}${chatCode}`;
          const chatCodeEscaped = `${ESCAPED_PREFIX}${chatCode}`;
          const formattedHexCode = prefs.hexUpperCase ? hexCode : hexCode.toLowerCase();

          return (
            <List.Item
              key={fullChatCode}
              icon={{ source: Icon.Contrast, tintColor: formattedHexCode }}
              title={name}
              subtitle={fullChatCode}
              keywords={keywords}
              actions={generateActionPanel(fullChatCode, chatCodeEscaped, formattedHexCode)}
            />
          );
        })}
      </List.Section>

      <List.Section title="Formatting">
        {FORMATTING.map(({ name, icon, chatCode }) => {
          const fullChatCode = `${PREFIX}${chatCode}`;
          const chatCodeEscaped = `${ESCAPED_PREFIX}${chatCode}`;

          return (
            <List.Item
              key={fullChatCode}
              icon={icon}
              title={name}
              subtitle={fullChatCode}
              actions={generateActionPanel(fullChatCode, chatCodeEscaped)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
