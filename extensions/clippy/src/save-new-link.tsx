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
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);

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

      await showToast({
        style: Toast.Style.Success,
        title: "Link saved!",
        message: validUrl,
      });

      setUrl("");
      await popToRoot();
    } catch (error) {
      showFailureToast(error, { title: "Link save failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
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
