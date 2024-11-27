import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { Author } from "./types";
import { addAuthorToCache, cache, removeAuthorFromCache } from "./utils";
import { useRef } from "react";

export type AddOrEditAuthorProps = {
  author?: Author;
};

export default function AddOrEditAuthor({ author }: AddOrEditAuthorProps) {
  const nav = useNavigation();
  const shouldGoBack = useRef(false);

  const [present, past, target] = author ? ["Edit", "Edited", ""] : ["Add", "Added", "to Authors"];
  const { handleSubmit, itemProps, reset, focus } = useForm<Author>({
    initialValues: author,
    onSubmit(values) {
      if (author && cache.has(author.email)) {
        removeAuthorFromCache(author.email);
      }
      addAuthorToCache(values as Author);
      showToast(Toast.Style.Success, `${past} ${values.name} <${values.email}> ${target}`);

      if (shouldGoBack.current) {
        if (author) {
          nav.pop();
        } else {
          popToRoot();
        }
      }
    },
    validation: {
      name: FormValidation.Required,
      email: (value) => {
        if (value && !value.includes("@")) {
          return "Enter a valid email address";
        } else if (!value) {
          return "The item is required";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle={`${present} Author`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`${present} Author`}
            icon={Icon.AddPerson}
            onSubmit={(input) => {
              shouldGoBack.current = true;
              handleSubmit(input as Author);
            }}
          />
          <Action.SubmitForm
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            title={`Add Another Author`}
            icon={Icon.AddPerson}
            onSubmit={(input) => {
              shouldGoBack.current = false;
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
