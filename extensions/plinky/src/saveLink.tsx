import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import React from "react";

interface Preferences {
  apiKey: string;
  integrationName: string;
}

interface FormValues {
  url: string;
}

interface PlinkyResponse {
  id: string;
  originalURL: string;
  resolvedURL: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function Command() {
  const [urlError, setUrlError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.url) {
      setUrlError("URL is required");
      return;
    }

    setIsLoading(true);
    const preferences = getPreferenceValues<Preferences>();

    try {
      const response = await fetch("https://api.plinky.app/link", {
        method: "POST",
        headers: {
          "X-PLINKY-API-KEY": preferences.apiKey,
          "X-PLINKY-API-VERSION": "2024-02-29",
          "X-PLINKY-INTEGRATION-NAME": preferences.integrationName || "Raycast",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: values.url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText) as {
            error?: boolean;
            reason?: string;
          };
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error(
          errorData.reason || `HTTP error! status: ${response.status}`
        );
      }

      const data = (await response.json()) as PlinkyResponse;

      await showToast({
        style: Toast.Style.Success,
        title: "Link saved to Plinky",
        message: data.originalURL,
      });

      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save link",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("URL is required");
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
