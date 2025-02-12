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
import { useEffect, useState } from "react";
import { getOutputDevices, setOutputDevice } from "./utils";
import { usePromise } from "@raycast/utils";

export function AirPlaySelector() {
  const { data, isLoading } = usePromise(getOutputDevices);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (data == null) return;
    const selected = data.find((item) => item.selected);
    if (selected == null) return;
    setActive(selected.name);
  }, [data]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by title...">
      {data?.map((item, index) => (
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
