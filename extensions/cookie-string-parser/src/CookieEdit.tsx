import { Form, ActionPanel, Action } from "@raycast/api";
import { useState, useCallback } from "react";
import { ListView } from "./ListView";
import { getCookiesWithEditedValue } from "./utils";

export function CookieEdit({
  cookies,
  cookieToEdit,
}: {
  cookies: Record<string, string>;
  cookieToEdit: Record<string, string>;
}) {
  const [editedCookie, setEditedCookie] = useState(cookieToEdit);

  const onEditCookie = useCallback((id: string, value: string) => {
    setEditedCookie({ ...editedCookie, [id]: value });
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push
            title="Save"
            target={<ListView cookies={getCookiesWithEditedValue(cookies, cookieToEdit, editedCookie)} />}
          />
        </ActionPanel>
      }
    >
      <Form.TextField onChange={(v) => onEditCookie("key", v)} id="key" title="Key" defaultValue={cookieToEdit.key} />
      <Form.TextArea
        onChange={(v) => onEditCookie("value", v)}
        id="value"
        title="Value"
        defaultValue={cookieToEdit.value}
      />
    </Form>
  );
}
