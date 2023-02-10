import React, { useState } from "react";
import { ActionPanel, Form, getPreferenceValues } from "@raycast/api";
import { Taction } from "./util/shortcut";
import { tactionForms } from "./create-shortcut";
import { shortcutTips } from "./util/constants";
import { ActionRunShortcut } from "./components/action-run-shortcut";
import { ActionOnTactions } from "./components/action-on-tactions";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { Preferences } from "./types/preferences";

export default function CreateShortcut() {
  const [tactions, setTactions] = useState<Taction[]>([]);
  const { primaryAction, closeMainWindow } = getPreferenceValues<Preferences>();

  return (
    <Form
      actions={
        <RunShortcutActions
          primaryAction={primaryAction}
          tactions={tactions}
          setTactions={setTactions}
          closeMainWindow={closeMainWindow}
        />
      }
    >
      {tactionForms(tactions, setTactions)}
      <Form.Description text={shortcutTips.key} />
      <Form.Description text={shortcutTips.action} />
    </Form>
  );
}

function RunShortcutActions(props: {
  primaryAction: string;
  tactions: Taction[];
  setTactions: React.Dispatch<React.SetStateAction<Taction[]>>;
  closeMainWindow: boolean;
}) {
  const { primaryAction, tactions, setTactions, closeMainWindow } = props;
  console.debug(primaryAction);
  return (
    <ActionPanel>
      <ActionRunShortcut primaryAction={primaryAction} closeMainWindow={closeMainWindow} tactions={tactions} />

      <ActionOnTactions tactions={tactions} setTactions={setTactions} />
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
