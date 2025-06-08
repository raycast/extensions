import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import AuthenticatedView from "./components/authenticated-view";
import { saveLink } from "../lib/api";
import { API_URL } from "../lib/api-url";
import { authorize } from "../lib/oauth";
import { isUrlLike } from "../lib/is-url-like";
import { ensureValidUrl } from "../lib/ensure-valid-url";

function SaveNewLink() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [isLoading] = useState(false);

  async function handleSubmit() {
    if (!url.trim()) {
      setUrlError("URL is required");
      return;
    }

    if (!isUrlLike(url.trim())) {
      setUrlError("Please enter a valid URL");
      return;
    }

    const validUrl = ensureValidUrl(url.trim());

    // Optimistic update - immediately show success and close
    await showToast({
      style: Toast.Style.Success,
      title: "Link saved!",
      message: validUrl,
    });

    // Clear form and go back to root immediately
    setUrl("");
    await popToRoot();

    // Save in background
    try {
      const token = await authorize();
      const result = await saveLink({
        url: validUrl,
        token,
        apiUrl: API_URL,
      });

      if (!result.success) {
        // If it failed, show a subtle error notification
        await showToast({
          style: Toast.Style.Failure,
          title: "Link save failed",
          message: result.error || "Please try again",
        });
      }
    } catch (error) {
      // Error already handled by toast
      // Show a subtle error notification
      await showToast({
        style: Toast.Style.Failure,
        title: "Link save failed",
        message: "Please try again",
      });
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
        value={url}
        onChange={(value) => {
          setUrl(value);
          setUrlError(undefined);
        }}
        error={urlError}
        autoFocus
      />
    </Form>
  );
}

export default function Command() {
  return <AuthenticatedView component={SaveNewLink} />;
}
