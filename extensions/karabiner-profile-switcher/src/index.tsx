import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  Color,
  showHUD,
  popToRoot,
  closeMainWindow,
  open,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ILayout } from "./model/interfaces";
import { isKarabinerCliAvailable, KarabinerManager } from "./model/KarabinerManager";

function toastErrorOptions(message: string, error: string): Toast.Options {
  return {
    title: "An error occurred",
    message,
    style: Toast.Style.Failure,
    primaryAction: {
      title: "Copy Error",
      onAction: () => Clipboard.copy(`${error}`),
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
    },
  };
}

async function handleLayoutSwitch(profile: ILayout) {
  try {
    await profile.activate();
    await Promise.all([showHUD(`Activated ${profile.title}`), popToRoot(), closeMainWindow()]);
  } catch (e) {
    await showToast(toastErrorOptions(`Couldn't activate ${profile.title}`, `${e}`));
  }
}

export default function Command() {
  const [profiles, setProfiles] = useState<ILayout[]>([]);
  const [loadingErr, setLoadingErr] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setProfiles(await KarabinerManager.getAll());
      } catch (e) {
        if (!(await isKarabinerCliAvailable())) {
          setLoadingErr(true);
          const options: Toast.Options = {
            ...toastErrorOptions("Karabiner Elements CLI not available", `${e}`),
            secondaryAction: {
              title: "Get Karabiner",
              onAction: () => open("https://karabiner-elements.pqrs.org"),
              shortcut: { modifiers: ["cmd"], key: "o" },
            },
          };
          await showToast(options);
        } else {
          await showToast(toastErrorOptions("Couldn't get profiles", `${e}`));
        }
      }
    })();
  }, []);

  return (
    <List isLoading={profiles.length === 0 && !loadingErr} searchBarPlaceholder="Search available layouts...">
      {profiles.map((source) => (
        <List.Item
          key={source.id}
          icon={source.active ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
          title={source.title}
          accessories={[{ text: source.active ? "Current Profile" : "" }]}
          keywords={[source.id]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Checkmark} title="Activate" onAction={() => handleLayoutSwitch(source)} />
              <Action
                icon={Icon.Gear}
                title="Open Karabiner Elements"
                onAction={() => open("/System/Volumes/Data/Applications/Karabiner-Elements.app")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
