import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  LocalStorage,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  List,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { applyLayout, listDisplays } from "swift:../swift/screen-align";
import { Arrangement, Axis, Display, formatOffset, mainOf } from "./displays";

const STORAGE_KEY = "layouts";

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

async function loadLayouts(): Promise<Layout[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Layout[];
  } catch {
    return [];
  }
}

const saveLayouts = (layouts: Layout[]) => LocalStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));

export default function Command() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [axis, setAxis] = useState<Axis>("vertical");
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = async () => {
    const [stored, current] = await Promise.all([
      loadLayouts(),
      listDisplays() as unknown as Promise<Arrangement>,
    ]);
    setLayouts(stored);
    setDisplays(current.displays);
    setAxis(current.axis);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const signature = signatureOf(displays);
  const main = mainOf(displays);

  const apply = async (layout: Layout) => {
    setIsLoading(true);
    try {
      const result = (await applyLayout(layout.entries)) as unknown as Arrangement;
      setDisplays(result.displays);
      setAxis(result.axis);
      await showToast({ style: Toast.Style.Success, title: `Applied ${layout.name}` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not apply the layout",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const remove = async (layout: Layout) => {
    const confirmed = await confirmAlert({
      title: `Delete ${layout.name}?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const next = layouts.filter((item) => item.id !== layout.id);
    await saveLayouts(next);
    setLayouts(next);
  };

  const saveCurrent = (name: string) =>
    (async () => {
      const { displays: current } = (await listDisplays()) as unknown as Arrangement;
      const layout: Layout = {
        id: `${Date.now()}`,
        name: name.trim() || "Layout",
        savedAt: Date.now(),
        signature: signatureOf(current),
        displayNames: current.map((d) => d.name),
        entries: current.map(({ uuid, x, y }) => ({ uuid, x, y })),
      };
      const next = [layout, ...layouts];
      await saveLayouts(next);
      setLayouts(next);
      await showToast({ style: Toast.Style.Success, title: `Saved ${layout.name}` });
    })();

  const saveAction = (
    <Action
      title="Save Current Arrangement"
      icon={Icon.PlusCircle}
      shortcut={Keyboard.Shortcut.Common.Save}
      onAction={() => push(<SaveForm displays={displays} onSave={saveCurrent} />)}
    />
  );

  return (
    <List isLoading={isLoading}>
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
        {layouts.map((layout) => {
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
      {layouts.length === 0 && !isLoading && (
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

function SaveForm({ displays, onSave }: { displays: Display[]; onSave: (name: string) => void }) {
  const { pop } = useNavigation();
  const suggestion = displays.map((d) => d.name).join(" + ");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Layout"
            onSubmit={(values: { name: string }) => {
              onSave(values.name);
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
