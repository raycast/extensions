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
import { Help } from "./Help";
import { LayoutManager } from "./model/LayoutManager";
import { ILayout } from "./model/interfaces";

function toastErrorOptions(message: string, error: string): Toast.Options {
  return {
    title: "An Error Occured",
    message,
    style: Toast.Style.Failure,
    primaryAction: {
      title: "Copy Error",
      onAction: () => Clipboard.copy(`${error}`),
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
    },
  };
}

async function handleLayoutSwitch(source: ILayout) {
  try {
    await source.activate();
    await Promise.all([showHUD(`⌨️ Activated '${source.title}' Layout`), popToRoot(), closeMainWindow()]);
  } catch (e) {
    await showToast(toastErrorOptions("Couldn't Activate Layout", `${e}`));
  }
}

export default function Command() {
  const [layouts, setLayouts] = useState<ILayout[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLayouts(await LayoutManager.getAll());
      } catch (e) {
        await showToast(toastErrorOptions("Couldn't Get Layouts", `${e}`));
      }
    })();
  }, []);

  return (
    <List isLoading={layouts.length === 0} searchBarPlaceholder="Search available layout...">
      {layouts.map((source) => (
        <List.Item
          key={source.id}
          icon={source.active ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Circle}
          title={source.title}
          accessoryTitle={source.active ? "Current Layout" : ""}
          keywords={[source.id]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Checkmark} title="Activate" onAction={() => handleLayoutSwitch(source)} />
              <Action
                icon={Icon.Gear}
                title="Keyboard Preferences"
                onAction={() => open("/System/Library/PreferencePanes/Keyboard.prefPane")}
              />
              <Action.Push icon={Icon.QuestionMark} title="Get More Layouts" target={<Help />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
