import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Clipboard,
  Toast,
  getPreferenceValues,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";
import { ofetch } from "ofetch";
import {
  ExtensionPreferences,
  CreateUrlRequest,
  CreateUrlResponse,
} from "./types";
import { getCachedOrFreshAuthCookie } from "./auth";

interface ShortenUrlValues {
  longurl: string;
  slug: string;
  expiry: string;
}

// Expiry options configuration
const EXPIRY_OPTIONS = {
  never: { title: "Never", seconds: undefined },
  "10-mins": { title: "10 Minutes", seconds: 10 * 60 },
  "30-mins": { title: "30 Minutes", seconds: 30 * 60 },
  "1-hr": { title: "1 Hour", seconds: 60 * 60 },
  "12-hr": { title: "12 Hours", seconds: 12 * 60 * 60 },
  "1-day": { title: "1 Day", seconds: 24 * 60 * 60 },
  "1-wk": { title: "1 Week", seconds: 7 * 24 * 60 * 60 },
  "1-mon": { title: "1 Month", seconds: 30 * 24 * 60 * 60 },
  "3-mon": { title: "3 Months", seconds: 90 * 24 * 60 * 60 },
  "6-mon": { title: "6 Months", seconds: 180 * 24 * 60 * 60 },
  "1-yr": { title: "1 Year", seconds: 365 * 24 * 60 * 60 },
} as const;

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { handleSubmit, itemProps } = useForm<ShortenUrlValues>({
    async onSubmit(values) {
      showToast({
        style: Toast.Style.Animated,
        title: "Shortening URL...",
      });
      try {
        const url = new URL("/api/new", preferences["chotto-host"]);
        const authCookie = await getCachedOrFreshAuthCookie(preferences);
        if (!authCookie) {
          showToast({
            style: Toast.Style.Failure,
            title: "Authentication Failed",
            message: "Could not retrieve authentication cookie.",
          });
          return;
        }

        const expiry =
          EXPIRY_OPTIONS[values.expiry as keyof typeof EXPIRY_OPTIONS]?.seconds;

        const body: CreateUrlRequest = {
          shortlink: values.slug || undefined,
          longlink: values.longurl,
          expiry_delay: expiry,
        };
        const result = await ofetch<CreateUrlResponse>(url.href, {
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            Cookie: authCookie,
            "Content-Type": "application/json",
          },
        });

        const shortened = new URL(result, preferences["chotto-host"]);
        Clipboard.copy(shortened.href);
        showHUD("Copied to clipboard");
        popToRoot({ clearSearchBar: true });
      } catch (error) {
        console.error("Error shortening URL:", error);
        showFailureToast(error, { title: "Failed to shorten URL" });
      }
    },
    validation: {
      longurl: (value) => {
        if (value) {
          try {
            new URL(value);
            return null;
          } catch (err) {
            const error = err as Error;
            return `Not a valid URL: ${error.message}`;
          }
        } else {
          return "This is required";
        }
      },
      slug: (value) => {
        return value?.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)$/) || value === ""
          ? null
          : "Only a-z, 0-9, - and _ are allowed";
      },
    },
  });

  useEffect(() => {
    const getClipboardContents = async () => {
      const content = await Clipboard.readText();
      if (content?.match(/https?:\/\/.+\..+/)) {
        itemProps.longurl.onChange?.call(globalThis, content);
        showToast({
          style: Toast.Style.Success,
          title: "Pasted link from clipboard",
        });
      }
    };
    getClipboardContents();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Shorten URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Short URL"
        placeholder="random-word-sequence-by-default"
        {...itemProps.slug}
      />
      <Form.TextField
        title="Long URL"
        placeholder="Enter long URL..."
        {...itemProps.longurl}
      />
      <Form.Dropdown title="Expiry" storeValue {...itemProps.expiry}>
        {Object.entries(EXPIRY_OPTIONS).map(([value, { title }]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
