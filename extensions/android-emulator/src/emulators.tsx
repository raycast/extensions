import { useEffect, useState } from "react";
import { Emulator } from "./types";
import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { getEmulators } from "./emulatorUtil";

export function Emulators(props: EmulatorsProps) {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [emulators, setEmulators] = useState<Emulator[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const emulators = await getEmulators();
        setLoading(false);
        setEmulators(emulators);
      } catch (error: any) {
        setLoading(false);
        await showToast({ title: `Error: ${error}`, style: Toast.Style.Failure });
      }
    })();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Choose Emulator">
      {emulators.map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.name}
            actions={
              <ActionPanel>
                <Action title="Choose" onAction={() => props.onEmulatorChoosen(item)}></Action>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
interface EmulatorsProps {
  onEmulatorChoosen: (emulator: Emulator) => void;
}
