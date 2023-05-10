import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useRef } from "react";
import { Author } from "./types";
import { addAuthorToCache, cache, removeAuthorFromCache } from "./utils";

export type AddOrEditAuthorProps = {
  author?: Author;
};

export default function AddOrEditAuthor({ author }: AddOrEditAuthorProps) {
  const nav = useNavigation();
  const nameRef = useRef<Form.TextField>(null);
  const emailRef = useRef<Form.TextField>(null);
  const [present, past, target] = author ? ["Edit", "Edited", ""] : ["Add", "Added", "to Authors"];

  const addAuthor = (values: Form.Values) => {
    if (author && cache.has(author.email)) {
      removeAuthorFromCache(author.email);
    }
    addAuthorToCache(values as Author);
    showToast(Toast.Style.Success, `${past} ${values.name} <${values.email}> ${target}`);
  };

  const addAndReturn = useCallback((values: Form.Values) => {
    addAuthor(values);
    nav.pop();
  }, []);

  const addAndAddAnother = useCallback((values: Form.Values) => {
    addAuthor(values);
    nameRef.current?.reset();
    emailRef.current?.reset();
    nameRef.current?.focus();
  }, []);

  return (
    <Form
      navigationTitle={`${present} Author`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`${present} Author`} onSubmit={addAndReturn} />
          {!author && <Action.SubmitForm title="Add Another Author" onSubmit={addAndAddAnother} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Fox Mulder"
        autoFocus
        ref={nameRef}
        defaultValue={author?.name}
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="f.mulder@fbi.gov"
        ref={emailRef}
        defaultValue={author?.email}
      />
    </Form>
  );
}
