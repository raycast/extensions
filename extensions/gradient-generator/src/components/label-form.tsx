import { Action, ActionPanel, Form, Icon, useNavigation } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import React, { useRef, useState } from 'react';

export default function LabelForm({
  initialLabel,
  onSubmit,
}: {
  initialLabel?: string;
  onSubmit: (label: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState(initialLabel ?? '');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      if (await onSubmit(label.trim())) pop();
    } catch (error) {
      await showFailureToast(error, { title: 'Could Not Save Label' });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Label"
            icon={Icon.Text}
            onSubmit={submit}
          />
          {!busy && <Action title="Cancel" onAction={pop} />}
        </ActionPanel>
      }
    >
      <Form.Description text="Leave the label empty to clear it. Reusing a label requires confirmation before replacing the other saved gradient(s)." />
      <Form.TextField
        id="label"
        title="Label"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Sunset, Brand Accent"
      />
    </Form>
  );
}
