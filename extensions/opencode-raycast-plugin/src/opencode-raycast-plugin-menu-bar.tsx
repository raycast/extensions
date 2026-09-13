import {
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { progressIcon, windowRows } from "./lib/display";
import { isKeyProblem } from "./lib/types";
import { collectUsage, readInitialPayload } from "./lib/usage";

function openFullView() {
  launchCommand({
    name: "opencode-raycast-plugin",
    type: LaunchType.UserInitiated,
  }).catch(() => undefined);
}

export default function Command() {
  const { data, isLoading, mutate } = useCachedPromise(
    () => collectUsage(false),
    [],
    {
      initialData: readInitialPayload(),
      keepPreviousData: true,
    },
  );

  const refresh = () =>
    mutate(collectUsage(true), { shouldRevalidateAfter: false });

  const result = data ?? null;

  const renderContent = () => {
    if (!result)
      return (
        <MenuBarExtra.Item
          title={isLoading ? "Loading…" : "No data"}
          onAction={refresh}
        />
      );
    if (!result.ok) {
      const keyProblem = isKeyProblem(result.failure.type);
      return (
        <>
          <MenuBarExtra.Item
            icon={Icon.Warning}
            title={result.failure.message}
            onAction={refresh}
          />
          {keyProblem && (
            <MenuBarExtra.Item
              icon={Icon.Gear}
              title="Open Extension Preferences"
              onAction={() => openExtensionPreferences()}
            />
          )}
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            icon={Icon.RotateClockwise}
            title="Force refresh"
            onAction={refresh}
          />
          <MenuBarExtra.Item
            icon={Icon.Maximize}
            title="Open full view"
            onAction={openFullView}
          />
        </>
      );
    }

    const { payload } = result;
    const rows = windowRows(payload.windows, new Date());

    return (
      <>
        {payload.offline && (
          <MenuBarExtra.Item
            icon={Icon.Cloud}
            title="Offline · showing last-known data"
            onAction={refresh}
          />
        )}
        <MenuBarExtra.Section title="Go limits">
          {rows.map((r) => (
            <MenuBarExtra.Item
              key={r.key}
              icon={progressIcon(r.pct)}
              title={r.title}
              subtitle={r.subtitle}
              onAction={openFullView}
            />
          ))}
        </MenuBarExtra.Section>
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          icon={Icon.RotateClockwise}
          title="Force refresh"
          onAction={refresh}
        />
        <MenuBarExtra.Item
          icon={Icon.Maximize}
          title="Open full view"
          onAction={openFullView}
        />
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Open Extension Preferences"
          onAction={() => openExtensionPreferences()}
        />
      </>
    );
  };

  return (
    <MenuBarExtra icon={{ source: "menubar-icon.png" }} tooltip="Opencode Info">
      {renderContent()}
    </MenuBarExtra>
  );
}
