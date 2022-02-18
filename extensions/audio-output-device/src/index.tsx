import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
} from '@raycast/api';
import { runAppleScript } from 'run-applescript';
import { useAsync } from 'react-use';
import { useEffect, useState } from 'react';
import { getOutputDevices, setOutputDevice } from './utils';

export default function Command() {
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
          icon="speaker.png"
          title={item.name}
          subtitle={item.type}
          accessoryIcon={{
            source: active === item.name ? Icon.Checkmark : Icon.Circle,
          }}
          actions={
            <ActionPanel>
              <Action
                onAction={async () => {
                  await setOutputDevice(item.name);
                  showToast({
                    style: Toast.Style.Success,
                    title: `Switched to ${item.name}`,
                  });
                  setActive(item.name);
                }}
                title={item.name}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
