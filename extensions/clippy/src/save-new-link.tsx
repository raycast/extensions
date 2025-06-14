import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
        throw new Error(result.error || "Please try again");
      }
    } catch (error) {
      // Show failure toast so user knows it failed and can retry
      showFailureToast(error, { title: "Link save failed" });
    }
  }

  return (
    <Form
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
