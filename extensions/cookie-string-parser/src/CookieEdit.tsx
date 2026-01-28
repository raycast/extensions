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
  const [keyError, setKeyError] = useState(false);
  const [valueError, setValueError] = useState(false);
  const [editedCookie, setEditedCookie] = useState(cookieToEdit);

  const onEditCookie = useCallback((id: string, value: string) => {
    if (id === "key") {
      setKeyError(false);
    }
    if (id === "value") {
      setValueError(false);
    }

    setEditedCookie({ ...editedCookie, [id]: value });
  }, []);

  const { pop } = useNavigation();

  const handleSave = useCallback(() => {
    const emptyKey = editedCookie.key.trim() === "";
    const emptyValue = editedCookie.value.trim() === "";
    if (emptyKey) {
      setKeyError(true);
    }
    if (emptyValue) {
      setValueError(true);
    }

    if (emptyKey || emptyValue) {
      return;
    }

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
      <Form.TextField
        error={keyError ? "Key is required" : undefined}
        onChange={(v) => onEditCookie("key", v)}
        id="key"
        title="Key"
        defaultValue={cookieToEdit.key}
      />
      <Form.TextArea
        error={valueError ? "Value is required" : undefined}
        onChange={(v) => onEditCookie("value", v)}
        id="value"
        title="Value"
        defaultValue={cookieToEdit.value}
      />
    </Form>
  );
}
