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
import { layoutPreview } from "./layout-preview";
import { applyLayout, desktopInfo, Layout, setMode } from "./rapto";

export default function ApplyLayout() {
  const { data: desktop, isLoading, error, revalidate } = usePromise(desktopInfo, [], { onError: () => undefined });

  if (error) {
    return (
      <List>
        <RaptoErrorView error={error} onRetry={revalidate} />
      </List>
    );
  }

  if (desktop && desktop.mode !== "manualAssignment" && desktop.mode !== "dragSnap") {
    const modeName = desktop.modes.find((mode) => mode.id === desktop.mode)?.name ?? desktop.mode;
    return (
      <List>
        <List.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title={`Layouts aren't used in ${modeName} mode`}
          description="Switch this desktop to Manual to arrange its windows into a layout."
          actions={
            <ActionPanel>
              <Action
                title="Switch to Manual"
                icon={Icon.Switch}
                onAction={async () => {
                  await setMode("manualAssignment");
                  revalidate();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const isDragSnap = desktop?.mode === "dragSnap";
  const builtIn = desktop?.layouts.filter((layout) => !layout.isCustom) ?? [];
  const custom = desktop?.layouts.filter((layout) => layout.isCustom) ?? [];
  const where = desktop?.display ? ` on ${desktop.display}` : "";

  const item = (layout: Layout) => (
    <List.Item
      key={layout.id}
      id={layout.id}
      icon={layoutPreview(layout)}
      title={layout.name}
      subtitle={layout.zones.length === 1 ? "1 zone" : `${layout.zones.length} zones`}
      accessories={layout.id === desktop?.currentLayoutID ? [{ icon: Icon.Checkmark, tooltip: "Current layout" }] : []}
      actions={
        <ActionPanel>
          <Action
            title={isDragSnap ? "Use for Drag to Snap" : "Apply Layout"}
            icon={Icon.AppWindowGrid3x3}
            onAction={async () => {
              await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
              if (await applyLayout(layout.id)) {
                if (isDragSnap) await showHUD(`Hold ⌥ while dragging to use ${layout.name}`);
              } else {
                await showToast({ style: Toast.Style.Failure, title: "Couldn't apply the layout" });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        isDragSnap ? `Layout for ⌥ while dragging${where}` : `Arrange this desktop's windows${where}`
      }
      selectedItemId={desktop?.currentLayoutID}
    >
      <List.Section title="Layouts">{builtIn.map(item)}</List.Section>
      <List.Section title="Your Layouts">{custom.map(item)}</List.Section>
    </List>
  );
}
