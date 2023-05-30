import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { Author } from "./types";
import { addAuthorToCache, cache, removeAuthorFromCache } from "./utils";

export type AddOrEditAuthorProps = {
  author?: Author;
};

export default function AddOrEditAuthor({ author }: AddOrEditAuthorProps) {
  const nav = useNavigation();
  const [present, past, target] = author ? ["Edit", "Edited", ""] : ["Add", "Added", "to Authors"];

  const { handleSubmit, itemProps, reset, focus } = useForm<Author>({
    initialValues: author,
    onSubmit(values) {
      if (author && cache.has(author.email)) {
        removeAuthorFromCache(author.email);
      }
      addAuthorToCache(values as Author);
      showToast(Toast.Style.Success, `${past} ${values.name} <${values.email}> ${target}`);
    },
    validation: {
      name: FormValidation.Required,
      email: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle={`${present} Author`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`${present} Author`}
            onSubmit={(input) => {
              handleSubmit(input as Author);
              nav.pop();
            }}
          />
          <Action.SubmitForm
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            title={`Add another Author`}
            onSubmit={(input) => {
              handleSubmit(input as Author);
              reset({ name: "", email: "" });
              focus("name");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Fox Mulder" autoFocus {...itemProps.name} />
      <Form.TextField title="Email" placeholder="f.mulder@fbi.gov" {...itemProps.email} />
    </Form>
  );
}
