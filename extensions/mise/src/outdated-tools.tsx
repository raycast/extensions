import { Icon, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { MiseLocation } from "./mise/locate";
import { listOutdated } from "./mise/outdated";
import { outdatedOptions, readPreferences } from "./ui/preferences";
import { useMise } from "./ui/useMise";

export default function Command() {
  const mise = useMise();
  if (mise.status === "loading") return <MenuBarExtra icon={Icon.ArrowUp} isLoading />;
  if (mise.status === "missing") {
    return (
      <MenuBarExtra icon={Icon.ArrowUp} tooltip="mise not found">
        <MenuBarExtra.Item title="mise not found" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }
  return <OutdatedTools location={mise.location} />;
}

function openOutdatedTools(upgrade?: string) {
  return launchCommand({
    name: "show-outdated",
    type: LaunchType.UserInitiated,
    context: upgrade ? { upgrade } : undefined,
  });
}

function OutdatedTools({ location }: { location: MiseLocation }) {
  const [prefs] = useState(readPreferences);
  const outdated = useCachedPromise(listOutdated, [location, outdatedOptions(prefs)]);
  const tools = outdated.data ?? [];
  const count = tools.length;

  return (
    <MenuBarExtra
      icon={Icon.ArrowUp}
      title={count > 0 ? String(count) : undefined}
      tooltip={`mise: ${count} outdated tools`}
      isLoading={outdated.isLoading}
    >
      <MenuBarExtra.Section title="Outdated">
        {count === 0 && <MenuBarExtra.Item title="All tools up to date" />}
        {tools.map((tool) => (
          <MenuBarExtra.Item
            key={tool.name}
            title={tool.name}
            subtitle={`${tool.current} → ${tool.latest}`}
            onAction={() => openOutdatedTools(tool.name)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {count > 0 && (
          <MenuBarExtra.Item title="Upgrade All" icon={Icon.ArrowUp} onAction={() => openOutdatedTools("all")} />
        )}
        <MenuBarExtra.Item title="Open Outdated Tools" icon={Icon.List} onAction={() => openOutdatedTools()} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={outdated.revalidate} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
