import { getPreferenceValues, Icon, LocalStorage, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";

import { computeTimeGroups } from "./utils";

type TimeGroups = Awaited<ReturnType<typeof computeTimeGroups>>;

export default function Command() {
  const [groups, setGroups] = useState<TimeGroups>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [primarySignature, setPrimarySignature] = useState<null | string>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [result, storedPrimary] = await Promise.all([
          computeTimeGroups(),
          LocalStorage.getItem<string>("team_time_primary_signature"),
        ]);

        if (cancelled) return;
        setGroups(result);
        setPrimarySignature(storedPrimary ?? null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && groups.length === 0) {
    // Hide the menu bar extra if there are no configured time zones.
    return null;
  }

  // Read how many groups to show in the menu bar title (default 1).
  const { menuBarTitleGroupCount } = getPreferenceValues<{ menuBarTitleGroupCount?: string }>();
  const count = Math.max(1, Number(menuBarTitleGroupCount ?? "1") || 1);
  // Determine the primary group: one that matches the stored primarySignature if available, otherwise the first.
  const primaryGroupIndex = groups.findIndex((group) => group.signature === primarySignature);
  const startIndex = primaryGroupIndex >= 0 ? primaryGroupIndex : 0;
  const ordered = groups.slice(startIndex).concat(groups.slice(0, startIndex));
  const visibleInTitle = ordered.slice(0, count);
  const label = visibleInTitle.map((group) => `${group.combinedFlags} ${group.time}`).join("  ");

  return (
    <MenuBarExtra icon={Icon.Clock} isLoading={isLoading} title={label} tooltip="Team Time">
      {groups.map((group) => {
        const isInTitle = visibleInTitle.some((g) => g.signature === group.signature);

        return (
          <MenuBarExtra.Item
            icon={isInTitle ? Icon.CircleFilled : Icon.Circle}
            key={group.signature}
            onAction={async () => {
              await LocalStorage.setItem("team_time_primary_signature", group.signature);
              setPrimarySignature(group.signature);
            }}
            subtitle={group.cities.join(", ")}
            title={`${group.combinedFlags} ${group.time}`}
          />
        );
      })}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Gear}
          onAction={() => openExtensionPreferences()}
          title="Open Team Time Preferences"
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
