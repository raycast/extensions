import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { JenkinsAPI, Jenkins } from './lib/api';
import { addJenkins } from "./lib/storage";
import { useState } from 'react';

export function AddJenkins(props: { jenkins?: Jenkins }) {
  const { pop } = useNavigation();
  const action = props.jenkins ? "Update" : "Add";

  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }
  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  return (
    <Form
      navigationTitle={action + " jenkins"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Confirm"
            onSubmit={async (input: Jenkins) => {
              try {
                const j = {
                  ...props.jenkins,
                  ...input,
                };
                const jenkinsAPI = new JenkinsAPI(j);
                await jenkinsAPI.inspect();
                await addJenkins(jenkinsAPI.jenkins);
                pop();
              } catch (err) {
                showToast(
                  Toast.Style.Failure,
                  action + " jenkins failed",
                  String(err)
                );
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        id="name"
        defaultValue={props.jenkins?.name}
        placeholder="Enter name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="URL"
        id="url"
        defaultValue={props.jenkins?.url}
        placeholder="Enter url"
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("The field should't be empty!");
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="Username"
        id="username"
        defaultValue={props.jenkins?.username}
        placeholder="Enter username"
      />
      <Form.PasswordField
        title="Token"
        id="token"
        defaultValue={props.jenkins?.token}
        placeholder="Enter token"
      />
    </Form>
  );
}