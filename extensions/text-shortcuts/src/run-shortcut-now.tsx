import { ActionPanel, Color, Form, getPreferenceValues, Icon } from "@raycast/api";
import React, { useState } from "react";
import { ActionOnTactions } from "./components/action-on-tactions";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionRunShortcut } from "./components/action-run-shortcut";
import { tactionForms } from "./create-shortcut";
import { Preferences } from "./types/preferences";
import { shortcutTips } from "./util/constants";
import { Shortcut, ShortcutInfo, ShortcutSource, Taction } from "./util/shortcut";

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
  const shortcutInfo: ShortcutInfo = {
    name: "test",
    tag: ["other"],
    icon: Icon.Star,
    iconColor: Color.Yellow,
    source: ShortcutSource.USER,
    id: "user_" + new Date().getTime(),
    visibility: false,
  };
  const shortcut: Shortcut = new Shortcut(shortcutInfo, tactions);

  return (
    <ActionPanel>
      <ActionRunShortcut
        primaryAction={primaryAction}
        closeMainWindow={closeMainWindow}
        shortcut={shortcut}
        visitItem={() => {}}
      />

      <ActionOnTactions tactions={tactions} setTactions={setTactions} />
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
