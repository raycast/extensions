import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useAsync } from "react-use";
import { useEffect, useState } from "react";
import { getOutputDevices, setOutputDevice } from "./utils";

export function AirPlaySelector() {
  const { value: items, loading } = useAsync(getOutputDevices, []);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (items == null) return;
    const selected = items.find((item) => item.selected);
    if (selected == null) return;
    setActive(selected.name);
  }, [items]);

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter by title...">
      {items?.map((item, index) => (
        <List.Item
          key={index}
          icon={{
            source: "speaker.png",
            tintColor: Color.SecondaryText,
          }}
          title={item.name}
          subtitle={item.type}
          actions={
            <ActionPanel>
              <Action
                title={`Select ${item.name}`}
                onAction={async () => {
                  await setOutputDevice(item.name);
                  closeMainWindow({ clearRootSearch: true });
                  popToRoot({ clearSearchBar: true });
                  showHUD(`Active output audio device set to ${item.name}`);
                  setActive(item.name);
                }}
              />
              <Action
                title={`Copy Device Name to Clipboard`}
                onAction={async () => {
                  await Clipboard.copy(item.name);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Device name copied to the clipboard",
                  });
                }}
              />
            </ActionPanel>
          }
          accessories={[
            {
              icon: active === item.name ? Icon.Checkmark : undefined,
            },
          ]}
        />
      ))}
    </List>
  );
}
