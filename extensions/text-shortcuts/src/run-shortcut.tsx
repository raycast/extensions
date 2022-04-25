import React, { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { handleLiveTemplate, runShortcut, Taction } from "./util/shortcut";
import { fetchItemInput } from "./util/input";
import { TactionActions, tactionForms } from "./create-shortcut";

export default function CreateShortcut() {
  const [tactions, setTactions] = useState<Taction[]>([]);

  return (
    <Form actions={<RunShortcutActions tactions={tactions} setTactions={setTactions} />}>
      {tactionForms(tactions, setTactions)}
      <Form.Description text={"  ⌘D       ⌘E       ⌘N        ⌘R            ⌘T              ⌘L"} />
      <Form.Description text={"Delete | Coder | Case | Replace | Transform | Template"} />
    </Form>
  );
}

function RunShortcutActions(props: {
  tactions: Taction[];
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>;
}) {
  const tactions = props.tactions;
  const setTactions = props.setTactions;
  return (
    <ActionPanel>
      <Action
        title={"Run Shortcut Now"}
        icon={Icon.TwoArrowsClockwise}
        onAction={async () => {
          const _inputItem = await fetchItemInput();
          const _runShortcut = runShortcut(_inputItem.content, handleLiveTemplate(tactions));
          await Clipboard.paste(_runShortcut);
          await showToast(Toast.Style.Success, "Pasted result to active app!");
        }}
      />

      <TactionActions tactions={tactions} setTactions={setTactions} />
    </ActionPanel>
  );
}
