import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useLocalStorage, usePromise } from "@raycast/utils";
import { applyLayout, listDisplays } from "swift:../swift/screen-align";
import { Arrangement, Axis, Display, formatOffset, mainOf } from "./displays";

type Entry = { uuid: string; x: number; y: number };

type Layout = {
  id: string;
  name: string;
  savedAt: number;
  /// Sorted display UUIDs, so a layout is only offered for the screens it was made on.
  signature: string;
  displayNames: string[];
  entries: Entry[];
};

const signatureOf = (displays: Display[]) =>
  displays
    .map((d) => d.uuid)
    .sort()
    .join("|");

export default function Command() {
  const {
    value: layouts,
    setValue: setLayouts,
    isLoading: isLoadingLayouts,
  } = useLocalStorage<Layout[]>("layouts", []);
  const {
    data,
    isLoading: isLoadingDisplays,
    error,
    revalidate,
  } = usePromise(async () => (await listDisplays()) as unknown as Arrangement);

  const displays = data?.displays ?? [];
  const axis: Axis = data?.axis ?? "vertical";
  const stored = layouts ?? [];
  const signature = signatureOf(displays);
  const main = mainOf(displays);
  const { push } = useNavigation();

  const apply = async (layout: Layout) => {
    try {
      await applyLayout(layout.entries);
      await showToast({ style: Toast.Style.Success, title: `Applied ${layout.name}` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not apply the layout" });
    } finally {
      revalidate();
    }
  };

  const remove = async (layout: Layout) => {
    const confirmed = await confirmAlert({
      title: `Delete ${layout.name}?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await setLayouts(stored.filter((item) => item.id !== layout.id));
  };

  // Resolves only once the layout is stored, so the form can stay open if it fails.
  const saveCurrent = async (name: string) => {
    const current = (await listDisplays()) as unknown as Arrangement;
    const layout: Layout = {
      id: `${Date.now()}`,
      name: name.trim() || "Layout",
      savedAt: Date.now(),
      signature: signatureOf(current.displays),
      displayNames: current.displays.map((d) => d.name),
      entries: current.displays.map(({ uuid, x, y }) => ({ uuid, x, y })),
    };
    await setLayouts([layout, ...stored]);
    await showToast({ style: Toast.Style.Success, title: `Saved ${layout.name}` });
  };

  const saveAction = (
    <Action
      title="Save Current Arrangement"
      icon={Icon.PlusCircle}
      shortcut={Keyboard.Shortcut.Common.Save}
      onAction={() => push(<SaveForm displays={displays} onSave={saveCurrent} />)}
    />
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not read the displays"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const isLoading = isLoadingDisplays || isLoadingLayouts;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Displays and Layouts">
      <List.Section title="Now">
        {displays.map((display) => (
          <List.Item
            key={display.id}
            title={display.name}
            icon={display.isMain ? Icon.Monitor : Icon.Desktop}
            subtitle={display.isMain || !main ? "Main display" : formatOffset(display, main, axis)}
            actions={<ActionPanel>{saveAction}</ActionPanel>}
          />
        ))}
      </List.Section>
      <List.Section title="Saved layouts">
        {stored.map((layout) => {
          const matches = layout.signature === signature;
          return (
            <List.Item
              key={layout.id}
              title={layout.name}
              icon={matches ? Icon.CheckCircle : Icon.Circle}
              subtitle={layout.displayNames.join(" + ")}
              accessories={[{ text: matches ? "These displays" : "Other displays" }]}
              actions={
                <ActionPanel>
                  <Action title="Apply Layout" icon={Icon.Play} onAction={() => apply(layout)} />
                  {saveAction}
                  <Action
                    title="Delete Layout"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => remove(layout)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {stored.length === 0 && !isLoading && (
        <List.EmptyView
          title="No saved layouts"
          description="Save the current arrangement, then restore it after a reconnect."
          icon={Icon.Window}
          actions={<ActionPanel>{saveAction}</ActionPanel>}
        />
      )}
    </List>
  );
}

function SaveForm({ displays, onSave }: { displays: Display[]; onSave: (name: string) => Promise<void> }) {
  const { pop } = useNavigation();
  const suggestion = displays.map((d) => d.name).join(" + ");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Layout"
            onSubmit={async (values: { name: string }) => {
              try {
                await onSave(values.name);
              } catch (error) {
                // Stay on the form so the typed name is not lost.
                await showFailureToast(error, { title: "Could not save the layout" });
                return;
              }
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={suggestion} placeholder="Desk" />
      <Form.Description text="Saves where every display sits right now. Restoring matches displays by their hardware UUID, so it survives unplugging." />
    </Form>
  );
}
