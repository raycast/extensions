import { useState } from "react";
import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
  LaunchProps,
  openExtensionPreferences,
  Detail,
  popToRoot,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { addLink } from "./utils/graphql";

interface Arguments {
  url: string;
}

export default function AddLinkCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const [url, setUrl] = useState(props.arguments?.url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to validate URL
  function isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Function to handle form submission
  async function handleSubmit(values: { url: string }) {
    if (!values.url.trim()) {
      setError("URL is required");
      return;
    }

    if (!isValidUrl(values.url)) {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding link...",
        message: "Saving to your Stacks collection",
      });

      const result = await addLink({
        target_url: values.url.trim(),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Link added successfully!",
        message: `"${result.add_link.title}" saved to Stacks`,
        primaryAction: {
          title: "View in Stacks",
          onAction: () => {
            popToRoot({ clearSearchBar: true });
          },
        },
      });

      // Reset form and go back
      setUrl("");
      popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to add link" });
    } finally {
      setIsLoading(false);
    }
  }

  // Show error state if there's an authentication error
  if (error && error.includes("API token not found")) {
    return (
      <Detail
        markdown={`
# API Token Required

Please configure your Stacks API token in the extension preferences to use this extension.

## How to find your token

1. Open betterstacks.com and make sure you're logged in
2. Open browser developer tools (Right-click → Inspect or Cmd+Option+I)
3. Navigate to 'Application' tab (Chrome) or 'Storage' tab (Firefox)
4. Expand the 'Cookies' section
5. Select the betterstacks.com domain
6. Find the 'gqlToken' cookie
7. Copy the cookie value

Your token is stored securely and only used to communicate with the Stacks API.
        `}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Link to Stacks"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Link" icon={Icon.Plus} onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action
              title="Clear URL"
              icon={Icon.Trash}
              onAction={() => {
                setUrl("");
                setError(null);
              }}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={url}
        onChange={setUrl}
        info="Enter the URL you want to save to Stacks"
        error={error && error.includes("URL") ? error : undefined}
        required
      />

      {error && !error.includes("API token") && !error.includes("URL") && (
        <>
          <Form.Separator />
          <Form.Description title="Error" text={`❌ ${error}`} />
        </>
      )}
    </Form>
  );
}
