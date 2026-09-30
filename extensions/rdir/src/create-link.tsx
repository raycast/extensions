import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useForm } from "@raycast/utils";

interface FormValues {
  url: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [initialUrl, setInitialUrl] = useState<string>("");
  const preferences = getPreferenceValues<Preferences>();

  // Check if API key is configured
  if (!preferences.apiKey || preferences.apiKey.trim() === "") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Open Extension Settings" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="API Key Required"
          text="Please configure your rdir.pl API key in the extension settings to use this command."
        />
      </Form>
    );
  }

  useEffect(() => {
    async function loadClipboard() {
      if (preferences.autoFillFromClipboard) {
        try {
          const clipboardText = await Clipboard.readText();
          if (clipboardText) {
            // Check if clipboard content is a valid URL
            try {
              new URL(clipboardText);
              setInitialUrl(clipboardText);
            } catch {
              // Not a valid URL, don't auto-fill
            }
          }
        } catch (error) {
          console.error("Failed to read clipboard:", error);
        }
      }
    }
    loadClipboard();
  }, [preferences.autoFillFromClipboard]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating short link...",
      });

      try {
        const response = await fetch("https://rdir.pl/api/v1/links", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${preferences.apiKey}`,
          },
          body: JSON.stringify({
            url: values.url,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create short link: ${response.statusText}`);
        }

        const data = await response.json();
        const shortUrl = data.shortUrl || data.short_url || data.url;

        if (preferences.copyToClipboard) {
          await Clipboard.copy(shortUrl);
          toast.style = Toast.Style.Success;
          toast.title = "Short link created and copied!";
          toast.message = shortUrl;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Short link created!";
          toast.message = shortUrl;
          toast.primaryAction = {
            title: "Copy to Clipboard",
            onAction: () => {
              Clipboard.copy(shortUrl);
              showToast({
                style: Toast.Style.Success,
                title: "Copied to clipboard",
              });
            },
          };
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create short link";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      url: (value) => {
        if (!value) {
          return "URL is required";
        }
        try {
          new URL(value);
        } catch {
          return "Please enter a valid URL";
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Short Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL to Shorten"
        placeholder="https://example.com/very/long/url"
        info="Enter the full URL you want to shorten"
        {...itemProps.url}
        value={itemProps.url.value || initialUrl}
      />
    </Form>
  );
}
