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
  async function handleSubmit(values: { name: string; domain: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding company" });

    if (values.name.length == 0 || values.domain.length == 0) {
      toast.style = Toast.Style.Failure;
      toast.message = "Name and domain should not be empty!";
      return;
    }

    // Create a data object
    const payload = {
      data: {
        type: "company",
        attributes: {
          name: values.name,
          domains: {
            items: [values.domain],
          },
        },
      },
    };

    try {
      const url = `${config.endpoints.api}/workspaces/${config.slug}/objects/company/records`;
      const {
        data: {
          data: {
            attributes: { _id },
          },
        },
      } = await axios.post(url, payload, getRequestConfig());

      const pageUrl = `${config.endpoints.web}/workspaces/${config.slug}/objects/company/records/${_id}`;
      setPageUrl(pageUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Added company";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed adding company";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Building} title="Add" onSubmit={handleSubmit} />;
}

function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [domainError, setDomainError] = useState<string | undefined>();
  const [pageUrl, setPageUrl] = useState<string | undefined>();
  const { config } = useConfig();

  function dropNameErrorIfNeeded() {
    setPageUrl(undefined);
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropDomainErrorIfNeeded() {
    setPageUrl(undefined);
    if (domainError && domainError.length > 0) {
      setDomainError(undefined);
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
        id="name"
        title="Name"
        placeholder="Enter company name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("required");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="Enter company domain (e.g. example.com)"
        error={domainError}
        onChange={dropDomainErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setDomainError("required");
          } else {
            dropDomainErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}

export default withAuth(Command);
