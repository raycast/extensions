import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createPersonalList, ListPrivacy, updatePersonalList } from "../lib/list-mutations";
import { TraktList } from "../lib/schema";

const PRIVACY: { value: ListPrivacy; title: string }[] = [
  { value: "private", title: "Private" },
  { value: "link", title: "Anyone with the link" },
  { value: "friends", title: "Friends" },
  { value: "public", title: "Public" },
];

type Values = { name: string; description: string; privacy: string };

/** Creates a list, or edits `list` when given. Calls `onSaved` once Trakt has confirmed the change. */
export const ListForm = ({ list, onSaved }: { list?: TraktList; onSaved: () => void }) => {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  const submit = async (values: Values) => {
    const name = values.name.trim();
    if (!name) return setNameError("A list needs a name");

    const fields = { name, description: values.description.trim(), privacy: values.privacy as ListPrivacy };
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: list ? "Saving the list" : "Creating the list",
    });
    try {
      if (list) await updatePersonalList(list, fields);
      else await createPersonalList(fields);
      toast.style = Toast.Style.Success;
      toast.title = list ? `Saved "${name}"` : `Created "${name}"`;
      onSaved();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = (error as Error).message;
    }
  };

  return (
    <Form
      navigationTitle={list ? `Edit "${list.name}"` : "New List"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={list ? "Save List" : "Create List"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={list?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextArea id="description" title="Description" defaultValue={list?.description ?? ""} />
      <Form.Dropdown id="privacy" title="Privacy" defaultValue={list?.privacy ?? "private"}>
        {PRIVACY.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
