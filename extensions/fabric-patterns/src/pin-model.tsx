import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { loadModelRows, orEmpty } from "../lib/loaders";
import { groupByVendor, type ModelPair, type ModelRow, pairKey } from "../lib/models";
import { errorText } from "./deliver";
import { modelStore, prefs } from "./storage";

/**
 * fabric's models, one section per vendor. With `pattern`, ↵ pins the chosen model to it (Result
 * and Manage Fabric); without, it is Manage Fabric's Models list, where ↵ copies the name.
 * A plain function, not a component, so the sections sit directly in the List.
 */
export function modelSections({
  rows,
  pinned,
  onPin,
  onUnpin,
}: {
  rows: ModelRow[];
  pinned?: ModelPair;
  onPin?: (r: ModelRow) => void;
  onUnpin?: () => void;
}) {
  return groupByVendor(rows).map(([vendor, rs]) => (
    <List.Section key={vendor} title={vendor} subtitle={`${rs.length}`}>
      {rs.map((r) => {
        const isPin = !!pinned && pairKey(pinned) === pairKey(r);
        const accessories: List.Item.Accessory[] = [];
        if (isPin) accessories.push({ icon: { source: Icon.Tack, tintColor: Color.Yellow }, tooltip: "Pinned" });
        if (r.isDefault) accessories.push({ tag: "fabric's default" });
        return (
          <List.Item
            key={pairKey(r)}
            id={pairKey(r)}
            title={r.model}
            keywords={[vendor]}
            accessories={accessories}
            actions={
              <ActionPanel>
                {onPin && <Action title="Pin Model" icon={Icon.Tack} onAction={() => onPin(r)} />}
                <Action.CopyToClipboard title="Copy Name" content={r.model} />
                <Action.CopyToClipboard title="Copy Vendor and Name" content={pairKey(r)} />
                {onUnpin && pinned && <Action title="Unpin Model" icon={Icon.TackDisabled} onAction={onUnpin} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  ));
}

/** Pick the model ↵ uses for `pattern`. A chosen Config's model still wins over it. `rows`: models already loaded (Manage Fabric). */
export function PinModel({ pattern, rows: given }: { pattern: string; rows?: ModelRow[] }) {
  const { pop } = useNavigation();
  const store = modelStore();
  const [pinned, setPinned] = useState<ModelPair>();
  useEffect(() => {
    store.load().then(
      (pins) => setPinned(pins[pattern]),
      () => undefined,
    );
  }, []);
  const [rows, setRows] = useState(given);
  useEffect(() => {
    if (!given) orEmpty(loadModelRows(prefs().fabricPath)).then(setRows);
  }, []);
  const isLoading = !rows;

  const change = async (what: () => Promise<unknown>, done: string) => {
    try {
      await what();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't save the pin", message: errorText(e) });
      return;
    }
    await showToast({ style: Toast.Style.Success, title: done });
    pop();
  };

  return (
    <List
      navigationTitle={`Pin a Model to ${pattern}`}
      isLoading={isLoading}
      searchBarPlaceholder="Search models…"
      selectedItemId={pinned && pairKey(pinned)}
    >
      <List.EmptyView title={isLoading ? "Loading models…" : "fabric listed no models"} />
      {modelSections({
        rows: rows ?? [],
        pinned,
        onPin: (r) => change(() => store.pin(pattern, r), `Pinned ${r.model} (${r.vendor}) to ${pattern}`),
        onUnpin: () => change(() => store.unpin(pattern), `${pattern} runs on fabric's choice again`),
      })}
    </List>
  );
}
