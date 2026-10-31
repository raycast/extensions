import { Icon, launchCommand, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { streamDetails } from "./lib/contract";
import { errorMessage, MissingCLIError, readStatus } from "./lib/glimmer";
import StopStreaming from "./stop-streaming";
import { ignoreErrorToast, openGlimmer } from "./components/shared";

export default function GlimmerStatus() {
  // Raycast invokes this command on the manifest’s 30-second interval.
  const { data, error, isLoading, revalidate, mutate } = useCachedPromise(readStatus, [], {
    onError: ignoreErrorToast,
  });
  const live = !error && data?.live;
  const title = error ? "Status unavailable" : live ? "Streaming" : data ? "Not streaming" : "Checking Glimmer…";

  async function stop() {
    try {
      await StopStreaming();
      // Mutations await revalidation in menu bar commands before the command finishes.
      await mutate();
    } catch (error) {
      await showHUD(errorMessage(error));
    }
  }

  return (
    <MenuBarExtra
      icon={live ? Icon.Play : Icon.Desktop}
      title={live ? "Glimmer" : undefined}
      tooltip={title}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={title}>
        {error ? (
          <>
            <MenuBarExtra.Item title={errorMessage(error)} />
            {error instanceof MissingCLIError ? (
              <MenuBarExtra.Item
                title="Set up Glimmer…"
                onAction={() => launchCommand({ name: "stream-app", type: LaunchType.UserInitiated })}
              />
            ) : null}
          </>
        ) : live && data ? (
          <>
            <MenuBarExtra.Item title={data.pc?.name ?? "PC unknown"} icon={Icon.Desktop} />
            <MenuBarExtra.Item title={data.app?.name ?? "App unknown"} icon={Icon.GameController} />
            <MenuBarExtra.Item title={streamDetails(data)} />
            {data.bitrateMbps === null ? null : <MenuBarExtra.Item title={`${data.bitrateMbps} Mbps`} />}
            <MenuBarExtra.Item title="Stop streaming" icon={Icon.Stop} onAction={stop} />
          </>
        ) : (
          <MenuBarExtra.Item title={data ? "Nothing is streaming." : "Reading stream details…"} />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title="Open Glimmer" icon="extension-icon.png" onAction={openGlimmer} />
      <MenuBarExtra.Item title="Refresh status" icon={Icon.ArrowClockwise} onAction={revalidate} />
    </MenuBarExtra>
  );
}
