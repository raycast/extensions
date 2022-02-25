import { ActionPanel, Action, Icon, List, showToast, Toast, Color, showHUD, popToRoot, closeMainWindow, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { Help } from "./Help";
import { LayoutManager } from "./model/inputs";
import { ILayout } from "./model/interfaces";

async function handleLayoutSwitch(source: ILayout) {
  try {
    await source.activate();
    await Promise.all([
      showHUD(`Activated ${source.title} Layout`),
      popToRoot(),
      closeMainWindow()
    ])
  } catch (e) {
    await showToast({ title: "Can't Activate Layout", style: Toast.Style.Failure});
  }
}

export default function Command() {
  const [sources, setSources] = useState<ILayout[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setSources(await LayoutManager.getAll());
      } catch (e) {
        await showToast({ title: "Error Getting Accounts", style: Toast.Style.Failure });
      }
    })()
  }, []);

  return (
    <List isLoading={sources.length === 0} searchBarPlaceholder="Search available layout...">
      {sources.map((source) => (
        <List.Item
          key={source.id}
          icon={source.active ? {source: Icon.Checkmark, tintColor: Color.Green} : Icon.Circle}
          title={source.title}
          accessoryTitle={source.active ? 'Current Layout' : ''}
          keywords={[source.id]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Checkmark} title="Activate" onAction={() => handleLayoutSwitch(source)} />
              <Action icon={Icon.Gear} title="Keyboard Preferences" onAction={() => open('/System/Library/PreferencePanes/Keyboard.prefPane')} />
              <Action.Push icon={Icon.QuestionMark} title="Get More Layouts" target={<Help/>}/>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
