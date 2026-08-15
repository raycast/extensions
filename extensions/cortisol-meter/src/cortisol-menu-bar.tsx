import { Color, Icon, MenuBarExtra } from "@raycast/api";

import {
  CortisolLevel,
  LEVEL_DETAILS,
  formatLevel,
  getIncreasedLevel,
  getLoweredLevel,
  useCortisolLevel,
} from "./cortisol";

export default function Command() {
  const { level, setLevel, isLoading } = useCortisolLevel();
  const details = LEVEL_DETAILS[level];

  async function updateLevel(nextLevel: CortisolLevel) {
    await setLevel(nextLevel);
  }

  return (
    <MenuBarExtra
      icon={{ source: details.menuBarIcon, tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip={`Cortisol: ${formatLevel(level)}`}
    >
      <MenuBarExtra.Section title="Cortisol Meter">
        <MenuBarExtra.Item
          icon={{ source: Icon.CircleFilled, tintColor: details.color }}
          title={`Current: ${formatLevel(level)}`}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowUp}
          title="Increase Cortisol"
          onAction={() => updateLevel(getIncreasedLevel(level))}
        />
        <MenuBarExtra.Item
          icon={Icon.ArrowDown}
          title="Lower Cortisol"
          onAction={() => updateLevel(getLoweredLevel(level))}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
