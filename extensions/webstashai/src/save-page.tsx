import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  getPreferenceValues,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  checkPage,
  handleApiError,
  savePage,
} from "./api/client";
import { WEBSTASH_DASHBOARD_URL } from "./constants";
import { isValidApiKey, isValidUrl } from "./helpers/utils";
import type { CheckPageResponse } from "./types";

interface SaveFormValues {
  url: string;
  title: string;
}

export default function SavePageCommand() {
  const apiKey = getPreferenceValues<Preferences>().apiKey;
  if (!isValidApiKey(apiKey)) {
    return <InvalidKeyView />;
  }

  return <SavePageForm />;
}

function SavePageForm() {
  const [duplicate, setDuplicate] = useState<CheckPageResponse["page"] | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const { handleSubmit, itemProps, setValue, reset } = useForm<SaveFormValues>({
    async onSubmit(values) {
      setIsSubmitting(true);
      try {
        const result = await savePage(
          values.url,
          values.title || undefined,
          idempotencyKeyRef.current,
        );

        await showToast({
          style: Toast.Style.Success,
          title: "Page Saved",
          message: result.title || values.url,
          primaryAction: result.webapp_url
            ? {
                title: "Open in WebStash",
                onAction: () => open(result.webapp_url!),
              }
            : undefined,
        });

        // Reset for next save
        setDuplicate(null);
        idempotencyKeyRef.current = crypto.randomUUID();
        reset({ url: "", title: "" });
      } catch (error) {
        const handled = await handleApiError(error);
        if (!handled) {
          const requestId =
            error instanceof ApiRequestError ? error.requestId : null;
          await showFailureToast("Save Failed", {
            message: error instanceof Error ? error.message : "Unknown error",
            primaryAction: requestId
              ? {
                  title: "Copy Error Details",
                  onAction: async () => {
                    await Clipboard.copy(
                      `Request ID: ${requestId}\nError: ${error}`,
                    );
                  },
                }
              : undefined,
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      url: (value) => {
        if (!value) return "URL is required";
        if (!isValidUrl(value)) return "Enter a valid URL (http or https)";
      },
    },
    initialValues: { url: "", title: "" },
  });

  // Pre-fill URL from clipboard on mount
  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && isValidUrl(text.trim())) {
        setValue("url", text.trim());
      }
    });
  }, []);

  // Check for duplicates when URL changes
  const lastCheckedUrl = useRef("");
  useEffect(() => {
    const url = itemProps.url.value ?? "";
    if (!url || !isValidUrl(url) || url === lastCheckedUrl.current) {
      if (!url || !isValidUrl(url)) setDuplicate(null);
      return;
    }

    lastCheckedUrl.current = url;
    const controller = new AbortController();

    checkPage(url, controller.signal)
      .then((res) => setDuplicate(res.exists ? (res.page ?? null) : null))
      .catch(() => {
        // Silently ignore check errors — not critical
      });

    return () => controller.abort();
  }, [itemProps.url.value]);

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Page"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="URL"
        placeholder="https://example.com/article"
        {...itemProps.url}
      />
      <Form.TextField
        title="Title"
        placeholder="Optional — auto-detected if empty"
        {...itemProps.title}
      />
      {duplicate && (
        <Form.Description
          title="⚠️ Already Saved"
          text={`"${duplicate.title}" was saved on ${new Date(duplicate.saved_at).toLocaleDateString()}. Submitting will re-process the page.`}
        />
      )}
    </Form>
  );
}

function InvalidKeyView() {
  return (
    <List>
      <List.EmptyView
        title="Invalid API Key"
        description="Your API key must start with 'wsk_'. Open extension preferences to update it."
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={async () => {
                const { openExtensionPreferences } =
                  await import("@raycast/api");
                await openExtensionPreferences();
              }}
            />
            <Action.OpenInBrowser
              title="Get Api Key"
              url={`${WEBSTASH_DASHBOARD_URL}/settings/api-keys`}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
