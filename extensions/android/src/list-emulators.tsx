import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
const { exec } = require("child_process");

export default function Command() {
  const [items, setItems] = useState<string[]>(() => []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function listDir() {
      exec(
        `${emulatorCommand()} -list-avds`,
        (err: string, stdout: string, stderr: string) => {
          console.log(err);
          console.log(stdout);
          console.log(stderr);

          //error
          if (err != null) {
            showToast(
              Toast.Style.Failure,
              "Make sure you have the right Android SDK location",
              err
            );
          }

          //Success
          if (stdout != null) {
            const avds = stdout.split("\n").filter((p: string) => p.trim());
            setItems(avds);
          }

          setLoading(false);
        }
      );
    }

    listDir();
  }, []);

  return (
    <List isLoading={loading}>
      {items?.map((emulator: string, index) => (
        <List.Item
          icon={{ source: "android-emulator.png" }}
          key={index}
          title={emulator}
          accessories={[{ icon: Icon.Mobile }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Emulator"
                onAction={() => openEmultror(emulator)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function openEmultror(emulator: string): void {
  exec(
    `${emulatorCommand()} @${emulator}`,
    (err: string, stdout: string, stderr: string) => {
      console.log(err);
      console.log(stdout);
      console.log(stderr);

      if (stderr != null) {
        showToast(Toast.Style.Failure, stderr);
      }
      popToRoot;
    }
  );
}

function emulatorCommand(): string {
  return `${androidSDK()}/emulator/emulator`;
}

function androidSDK() {
  return getPreferenceValues().androidSDK;
}
