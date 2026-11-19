import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  closeMainWindow,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { Help } from "./Help";
import { LayoutManager } from "./model/LayoutManager";
import { ILayout } from "./model/interfaces";
import { getWindowsRaycastPid } from "./model/win32";

async function handleLayoutSwitch(source: ILayout, closeRaycast: boolean, revalidate: () => Promise<unknown>) {
  try {
    const isWindows = process.platform === "win32";
    // raycast_foreground_pid only reports a PID while the Raycast window itself
    // is in front, so the 2s foreground-change wait never stalls on the app the
    // user was typing in when the command ran with Raycast hidden.
    const foregroundPid = closeRaycast && isWindows ? await getWindowsRaycastPid() : 0;

    if (closeRaycast && isWindows) {
      await closeMainWindow();
    }

    await source.activate(foregroundPid);

    if (closeRaycast && !isWindows) {
      await closeMainWindow();
    }

    if (closeRaycast) {
      await showHUD(`⌨️ Activated '${source.title}' Layout`);
    } else {
      await showToast({ title: `⌨️ Activated '${source.title}' Layout` });
    }

    // Keep the active-layout marker fresh in case the view stays mounted
    try {
      await revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not refresh layouts" });
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not switch layout" });
  }
}

export default function Command() {
  const { closeRaycast } = getPreferenceValues<Preferences.Switch>();
  const {
    data: layouts,
    isLoading,
    error,
    revalidate,
  } = usePromise(() => LayoutManager.getAll(), [], {
    failureToastOptions: { title: "Could not get layouts" },
  });

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="Couldn't load keyboard layouts"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search available layouts...">
      {layouts?.map((source) => (
        <List.Item
          key={source.id}
          icon={source.active ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Globe}
          title={source.title}
          keywords={[source.id]}
          accessories={source.active ? [{ text: "Current Layout" }] : []}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Checkmark}
                title="Activate"
                onAction={() => handleLayoutSwitch(source, closeRaycast, revalidate)}
              />
              <Action
                icon={Icon.Gear}
                title="Keyboard Preferences"
                onAction={() =>
                  open(
                    process.platform === "win32"
                      ? "ms-settings:regionlanguage"
                      : "/System/Library/PreferencePanes/Keyboard.prefPane",
                  )
                }
              />
              <Action.Push icon={Icon.QuestionMark} title="Get More Layouts" target={<Help />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
