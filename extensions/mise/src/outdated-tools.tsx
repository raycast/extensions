import { Icon, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import type { MiseLocation } from "./mise/locate";
import { currentOutdated, listOutdated, outdatedVersions } from "./mise/outdated";
import { outdatedOptions, readPreferences } from "./ui/preferences";
import { loadErrorInView, loadErrorMessage } from "./ui/LoadError";
import { MiseUpdateMenuSection } from "./ui/MiseUpdate";
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

// launchCommand rejects when the user has disabled Show Outdated Tools.
async function openOutdatedTools(upgrade?: string) {
  try {
    await launchCommand({
      name: "show-outdated",
      type: LaunchType.UserInitiated,
      context: upgrade ? { upgrade } : undefined,
    });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Show Outdated Tools" });
  }
}

function menuTooltip(outdated: number, unchecked: number): string {
  const tooltip = `mise: ${outdated} outdated tools`;
  return unchecked === 0 ? tooltip : `${tooltip}, ${unchecked} couldn't be checked`;
}

function OutdatedTools({ location }: { location: MiseLocation }) {
  const [prefs] = useState(readPreferences);
  const outdated = useCachedPromise(listOutdated, [location, outdatedOptions(prefs, location)], loadErrorInView);
  const data = currentOutdated(outdated.data);
  const tools = data?.tools ?? [];
  const unchecked = data?.unchecked ?? [];
  const count = tools.length;
  const failure = data === undefined ? outdated.error : undefined;

  return (
    <MenuBarExtra
      icon={Icon.ArrowUp}
      title={count > 0 ? String(count) : undefined}
      tooltip={failure ? "mise: could not check outdated tools" : menuTooltip(count, unchecked.length)}
      isLoading={outdated.isLoading || (!data && !outdated.error)}
    >
      <MiseUpdateMenuSection location={location} />
      <MenuBarExtra.Section title="Outdated">
        {failure && (
          <MenuBarExtra.Item
            title="Couldn't check outdated tools"
            subtitle={loadErrorMessage(failure)}
            icon={Icon.Warning}
            onAction={outdated.revalidate}
          />
        )}
        {data && count === 0 && unchecked.length === 0 && <MenuBarExtra.Item title="All tools up to date" />}
        {tools.map((tool) => (
          <MenuBarExtra.Item
            key={tool.name}
            title={tool.name}
            subtitle={outdatedVersions(tool)}
            onAction={() => openOutdatedTools(tool.name)}
          />
        ))}
      </MenuBarExtra.Section>
      {unchecked.length > 0 && (
        <MenuBarExtra.Section title="Couldn't Check">
          {unchecked.map((tool) => (
            <MenuBarExtra.Item
              key={`${tool.name}@${tool.version}`}
              title={tool.name}
              subtitle={tool.version}
              icon={Icon.Warning}
              tooltip="Retry the check"
              onAction={outdated.revalidate}
            />
          ))}
        </MenuBarExtra.Section>
      )}
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
