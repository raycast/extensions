import { useEntityOverrides } from "@lib/entity-overrides";
import { State } from "@lib/haapi";
import { getDisplayName } from "@lib/utils";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import React from "react";

export function EntityRenameForm(props: { state: State }): React.ReactElement {
  const s = props.state;
  const { pop } = useNavigation();
  const { getAlias, setAlias } = useEntityOverrides();
  const currentName = getDisplayName(s, getAlias(s.entity_id));

  const handle = async (input: Form.Values) => {
    const name = (input.name as string) ?? "";
    setAlias(s.entity_id, name);
    await showToast({
      style: Toast.Style.Success,
      title: name.trim().length > 0 ? "Custom Name Saved" : "Custom Name Removed",
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handle} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Display Name" defaultValue={currentName} placeholder={s.entity_id} />
      <Form.Description text="This name is only used in Raycast and does not change Home Assistant." />
    </Form>
  );
}
