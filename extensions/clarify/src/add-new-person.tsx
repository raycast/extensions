import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import axios from "axios";
import { getRequestConfig } from "./utils/net.util";
import { withAuth } from "./auth.provider";
import { Config, useConfig } from "./utils/config.util";

export interface SubmitProps {
  config: Config;
  setPageUrl: (url: string) => void;
}

function SubmitAction({ config, setPageUrl }: SubmitProps) {
  async function handleSubmit(values: { firstName: string; lastName: string; email: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding person" });

    if (values.firstName.length == 0 || values.lastName.length == 0 || values.email.length == 0) {
      toast.style = Toast.Style.Failure;
      toast.message = "First name, last name, and email should not be empty!";
      return;
    }

    // Create a data object
    const payload = {
      data: {
        type: "person",
        attributes: {
          name: {
            first_name: values.firstName,
            last_name: values.lastName,
          },
          email_addresses: {
            items: [values.email],
          },
        },
      },
    };

    try {
      const url = `${config.endpoints.api}/workspaces/${config.slug}/objects/person/records`;
      const {
        data: {
          data: {
            attributes: { _id },
          },
        },
      } = await axios.post(url, payload, getRequestConfig());

      const pageUrl = `${config.endpoints.web}/workspaces/${config.slug}/objects/person/records/${_id}`;
      setPageUrl(pageUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Added person";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed adding person";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Person} title="Add" onSubmit={handleSubmit} />;
}

function Command() {
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [lastNameError, setLastNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [pageUrl, setPageUrl] = useState<string | undefined>();
  const { config } = useConfig();

  function dropFirstNameErrorIfNeeded() {
    setPageUrl(undefined);
    if (firstNameError && firstNameError.length > 0) {
      setFirstNameError(undefined);
    }
  }

  function dropLastNameErrorIfNeeded() {
    setPageUrl(undefined);
    if (lastNameError && lastNameError.length > 0) {
      setLastNameError(undefined);
    }
  }

  function dropEmailErrorIfNeeded() {
    setPageUrl(undefined);
    if (emailError && emailError.length > 0) {
      setEmailError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {pageUrl && <Action.OpenInBrowser url={pageUrl} />}
          {config && <SubmitAction config={config} setPageUrl={setPageUrl} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="firstName"
        title="First Name"
        placeholder="Enter first name"
        error={firstNameError}
        onChange={dropFirstNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setFirstNameError("required");
          } else {
            dropFirstNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="lastName"
        title="Last Name"
        placeholder="Enter last name"
        error={lastNameError}
        onChange={dropLastNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setLastNameError("required");
          } else {
            dropLastNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter email"
        error={emailError}
        onChange={dropEmailErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setEmailError("required");
          } else {
            dropEmailErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}

export default withAuth(Command);
