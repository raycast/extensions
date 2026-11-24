import { useState } from "react";

import { Action, ActionPanel, Form, Icon, Keyboard, open, popToRoot, showHUD, showToast, Toast } from "@raycast/api";

import { ensureInstalled, isNumber, openLink, setLink } from "./multimeter";

interface Values {
  key: string;
  value: string;
  min: string;
  max: string;
  label: string;
  unit: string;
}

export default function Command() {
  const [keyError, setKeyError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();
  const [minError, setMinError] = useState<string | undefined>();
  const [maxError, setMaxError] = useState<string | undefined>();

  async function submit(values: Values) {
    const key = values.key.trim();
    let ok = true;
    if (!key) {
      setKeyError("Enter the meter's key");
      ok = false;
    }
    if (!isNumber(values.value)) {
      setValueError("Enter a number, like 42");
      ok = false;
    }
    if (values.min.trim() && !isNumber(values.min)) {
      setMinError("Enter a number or leave it empty");
      ok = false;
    }
    if (values.max.trim() && !isNumber(values.max)) {
      setMaxError("Enter a number or leave it empty");
      ok = false;
    }
    if (!ok) return;
    if (!(await ensureInstalled())) return;

    try {
      await openLink(setLink(values), true);
      await showHUD(`Set ${key.toLowerCase()} to ${values.value.trim()}`);
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't send the value",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Meter Value" icon={Icon.Gauge} onSubmit={submit} />
          <Action
            title="Add Meter in Multimeter"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={async () => {
              if (await ensureInstalled()) await openLink("multimeter://add", false);
            }}
          />
          <Action
            title="Open Multimeter Docs"
            icon={Icon.Book}
            onAction={() => open("https://multimeterapp.com/creating-meters")}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Updates every Sent Value meter that uses this key. Add one in Multimeter with Add Meter, Sent Value." />
      <Form.TextField
        id="key"
        title="Key"
        placeholder="deploys"
        info="The key you gave the Sent Value meter. Not case-sensitive."
        storeValue
        error={keyError}
        onChange={() => setKeyError(undefined)}
      />
      <Form.TextField
        id="value"
        title="Value"
        placeholder="42"
        error={valueError}
        onChange={() => setValueError(undefined)}
      />
      <Form.Separator />
      <Form.TextField
        id="min"
        title="Min"
        placeholder="Optional, like 0"
        info="Bottom of the meter's range."
        storeValue
        error={minError}
        onChange={() => setMinError(undefined)}
      />
      <Form.TextField
        id="max"
        title="Max"
        placeholder="Optional, like 100"
        info="Top of the meter's range."
        storeValue
        error={maxError}
        onChange={() => setMaxError(undefined)}
      />
      <Form.TextField id="label" title="Label" placeholder="Optional, like Deploys" storeValue />
      <Form.TextField id="unit" title="Unit" placeholder="Optional, like ms" storeValue />
    </Form>
  );
}
