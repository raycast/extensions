import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { RaptoErrorView } from "./components";
import { desktopInfo, Mode, setMode } from "./rapto";

const DETAILS: Record<Mode, { icon: Icon; description: string }> = {
  manualAssignment: { icon: Icon.AppWindowGrid3x3, description: "Pick or create a layout, Rapto places the windows" },
  autoTiling: { icon: Icon.Wand, description: "Rapto picks the layout as you open and close windows" },
  dragSnap: { icon: Icon.Mouse, description: "Drag a window to an edge to snap it" },
  none: { icon: Icon.XMarkCircle, description: "Rapto leaves this desktop alone" },
};

const ORDER: Mode[] = ["manualAssignment", "autoTiling", "dragSnap", "none"];

export default function ChangeMode() {
  const { data: desktop, isLoading, error, revalidate } = usePromise(desktopInfo, [], { onError: () => undefined });

  if (error) {
    return (
      <List>
        <RaptoErrorView error={error} onRetry={revalidate} />
      </List>
    );
  }

  const modes = ORDER.map((id) => desktop?.modes.find((mode) => mode.id === id)).filter((mode) => mode !== undefined);
  const where = desktop?.display ? ` on ${desktop.display}` : "";

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Mode for this desktop${where}`} selectedItemId={desktop?.mode}>
      {modes.map((mode) => (
        <List.Item
          key={mode.id}
          id={mode.id}
          icon={DETAILS[mode.id].icon}
          title={mode.name}
          subtitle={DETAILS[mode.id].description}
          accessories={mode.id === desktop?.mode ? [{ icon: Icon.Checkmark, tooltip: "Current mode" }] : []}
          actions={
            <ActionPanel>
              <Action
                title={`Switch to ${mode.name}`}
                icon={Icon.Switch}
                onAction={async () => {
                  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
                  if (await setMode(mode.id)) {
                    await showHUD(`Mode: ${mode.name}`);
                  } else {
                    await showToast({ style: Toast.Style.Failure, title: "Couldn't change the mode" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
