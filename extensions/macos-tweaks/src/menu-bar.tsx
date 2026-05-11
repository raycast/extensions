import { Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ALL_TWEAKS } from "./tweaks";
import { CATEGORY_META } from "./types";
import type { TweakCategory, TweakState } from "./types";
import { applyTweak, getAllTweakStates, resetTweak } from "./utils/defaults";
import { formatValue } from "./utils/format";

export default function TweaksMenuBar() {
  const [modified, setModified] = useState<TweakState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const states = await getAllTweakStates(ALL_TWEAKS);
    setModified(states.filter((t) => t.isModified));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const grouped = new Map<TweakCategory, TweakState[]>();
  for (const t of modified) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  const title = modified.length > 0 ? `${modified.length}` : undefined;

  return (
    <MenuBarExtra
      icon={Icon.Gear}
      title={title}
      tooltip={`macOS Tweaks: ${modified.length} modified`}
      isLoading={isLoading}
    >
      {modified.length === 0 ? (
        <MenuBarExtra.Item title="No Modified Tweaks" icon={Icon.CheckCircle} />
      ) : (
        Array.from(grouped.entries()).map(([category, tweaks]) => (
          <MenuBarExtra.Section key={category} title={CATEGORY_META[category].title}>
            {tweaks.map((tweak) => (
              <MenuBarExtra.Item
                key={tweak.id}
                title={tweak.title}
                subtitle={formatValue(tweak)}
                icon={Icon.Circle}
                onAction={async () => {
                  try {
                    if (tweak.type === "boolean") {
                      const newValue = !(tweak.currentValue === true);
                      applyTweak(tweak, newValue);
                      await showHUD(`${tweak.title}: ${newValue ? "On" : "Off"}`);
                    } else {
                      resetTweak(tweak);
                      await showHUD(`${tweak.title}: Reset to default`);
                    }
                    await reload();
                  } catch (error) {
                    await showHUD(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                  }
                }}
              />
            ))}
          </MenuBarExtra.Section>
        ))
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Browse All Tweaks..."
          icon={Icon.MagnifyingGlass}
          onAction={() => open("raycast://extensions/Undolog/macos-tweaks/browse-tweaks")}
        />
        <MenuBarExtra.Item
          title="My Tweaks..."
          icon={Icon.List}
          onAction={() => open("raycast://extensions/Undolog/macos-tweaks/my-tweaks")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
