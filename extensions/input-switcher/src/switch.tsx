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
import { getWindowsForegroundProcessId } from "./model/win32";

async function handleLayoutSwitch(source: ILayout, closeRaycast: boolean, revalidate: () => Promise<unknown>) {
  try {
    const isWindows = process.platform === "win32";
    const foregroundPid = closeRaycast && isWindows ? await getWindowsForegroundProcessId() : 0;

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
      try {
        await revalidate();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showFailureToast(message, { title: "Could not refresh layouts" });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showFailureToast(message, { title: "Could not switch layout" });
  }
}

export default function Command() {
  const { closeRaycast } = getPreferenceValues<{ closeRaycast: boolean }>();
  const {
    data: layouts,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    return await LayoutManager.getAll();
  });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: "Could not get layouts" });
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
                      ? "ms-settings:keyboard"
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
