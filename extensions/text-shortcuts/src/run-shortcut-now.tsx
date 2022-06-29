import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  Icon,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { handleLiveTemplate, runShortcut, Taction } from "./util/shortcut";
import { fetchItemInput } from "./util/input";
import { TactionActions, tactionForms } from "./create-shortcut";
import { Preference } from "./util/utils";

export default function CreateShortcut() {
  const [tactions, setTactions] = useState<Taction[]>([]);
  const { closeMainWindow } = getPreferenceValues<Preference>();

  return (
    <Form
      actions={<RunShortcutActions tactions={tactions} setTactions={setTactions} closeMainWindow={closeMainWindow} />}
    >
      {tactionForms(tactions, setTactions)}
      <Form.Description text={"  ⌘D       ⌘E       ⌘N        ⌘R            ⌘T              ⌘L"} />
      <Form.Description text={"Delete | Coder | Case | Replace | Transform | Template"} />
    </Form>
  );
}

function RunShortcutActions(props: {
  tactions: Taction[];
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>;
  closeMainWindow: boolean;
}) {
  const { tactions, setTactions, closeMainWindow } = props;
  return (
    <ActionPanel>
      <Action
        title={"Run Shortcut Now"}
        icon={Icon.TwoArrowsClockwise}
        onAction={async () => {
          const _inputItem = await fetchItemInput();
          const _runShortcut = runShortcut(_inputItem.content, handleLiveTemplate(tactions));
          await Clipboard.paste(_runShortcut);
          if (closeMainWindow) {
            await showHUD("Pasted result to active app");
          } else {
            await showToast(Toast.Style.Success, "Pasted result to active app!");
          }
        }}
      />

      <TactionActions tactions={tactions} setTactions={setTactions} />

      <ActionPanel.Section>
        <Action
          icon={Icon.Gear}
          title="Open Extension Preferences"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
