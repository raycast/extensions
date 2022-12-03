import { Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { getFocus, getFocusHistory, getIcon, isPaused, showFocus } from "./utils";
import { useState } from "react";
import { truncate } from "lodash";

export default function MenuBar() {
  const [focus, setFocus] = useState(getFocus);
  const icon = getIcon(focus?.icon);
  const history = getFocusHistory();

  if (isPaused()) {
    return null;
  }

  return (
    <MenuBarExtra icon={icon} title={truncate(focus.text, { length: 50 })}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Edit Focus"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => {
            launchCommand({ name: "set-focus", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="History">
        {history.map((focus, index) => (
          <MenuBarExtra.Item
            key={index}
            title={focus.text}
            shortcut={{
              modifiers: ["cmd"],
              key: (index + 1).toString() as "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9",
            }}
            onAction={() => {
              showFocus(focus, { background: false, hud: false });
              setFocus(focus);
            }}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
