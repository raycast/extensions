import { Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listTopOfMind, TopOfMindUnavailableError } from "./api";
import { getMymindObjectUrl } from "./helpers";

export default function TopOfMindMenuBarCommand() {
  const { data: items = [], error, isLoading, revalidate } = useCachedPromise(() => listTopOfMind({ limit: 5 }), [], {
    keepPreviousData: true,
  });

  async function openSaveCommand() {
    await launchCommand({ name: "save-to-mymind", type: LaunchType.UserInitiated });
  }

  async function openTopOfMindCommand() {
    await launchCommand({ name: "search-top-of-mind", type: LaunchType.UserInitiated });
  }

  return (
    <MenuBarExtra icon="assets/extension-icon.png" isLoading={isLoading} tooltip="Mymind Top of Mind">
      {error instanceof TopOfMindUnavailableError ? (
        <MenuBarExtra.Item title="Top of Mind Unavailable" />
      ) : items.length === 0 ? (
        <MenuBarExtra.Item title="No Top of Mind Items" />
      ) : (
        items.map((item) => (
          <MenuBarExtra.Item
            key={item.id}
            icon={Icon.Pin}
            title={item.title?.trim() || "Untitled"}
            onAction={() => open(getMymindObjectUrl(item.id))}
          />
        ))
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item icon={Icon.Plus} title="Save to Mymind" onAction={openSaveCommand} />
      <MenuBarExtra.Item icon={Icon.MagnifyingGlass} title="Open Search Top of Mind" onAction={openTopOfMindCommand} />
      <MenuBarExtra.Item icon={Icon.ArrowClockwise} title="Refresh Now" onAction={revalidate} />
    </MenuBarExtra>
  );
}
