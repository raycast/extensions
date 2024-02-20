import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState, useCallback } from "react";
import { getCookiesWithEditedValue } from "./utils";

export function CookieEdit({
  cookies,
  cookieToEdit,
  onEdit,
}: {
  cookies: Record<string, string>;
  cookieToEdit: Record<string, string>;
  onEdit: (editedCookies: Record<string, string>) => void;
}) {
  const [editedCookie, setEditedCookie] = useState(cookieToEdit);

  const onEditCookie = useCallback((id: string, value: string) => {
    setEditedCookie({ ...editedCookie, [id]: value });
  }, []);

  const { pop } = useNavigation();
  const handleSave = useCallback(() => {
    onEdit(getCookiesWithEditedValue(cookies, cookieToEdit, editedCookie));
    pop();
  }, [cookies, cookieToEdit, editedCookie]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save" onAction={handleSave} />
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
