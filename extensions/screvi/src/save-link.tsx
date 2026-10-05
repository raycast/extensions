import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  Toast,
  environment,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { articleUrl, post, SavedArticle, ScreviError } from "./lib/screvi";
import { tagTint } from "./lib/format";
import { useTags } from "./lib/useTags";

interface FormValues {
  url: string;
  tags: string[];
}

/**
 * Best guess at what the user means to save: the argument they typed, then the
 * page they are looking at, then a URL sitting on the clipboard.
 */
async function guessUrl(): Promise<string> {
  if (environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const active = tabs.find((tab) => tab.active);
      if (active?.url?.startsWith("http")) return active.url;
    } catch {
      // The browser extension is installed but no browser is running.
    }
  }
  try {
    const clipboard = (await Clipboard.readText())?.trim();
    if (clipboard && /^https?:\/\/\S+$/i.test(clipboard)) return clipboard;
  } catch {
    // Clipboard access can be denied; the field just stays empty.
  }
  return "";
}

export default function SaveLink({ arguments: args }: LaunchProps<{ arguments: { url?: string } }>) {
  const argumentUrl = args?.url?.trim() ?? "";
  const [isPrefilling, setIsPrefilling] = useState(!argumentUrl);
  const { data: tags, isLoading: isLoadingTags } = useTags();

  const { handleSubmit, itemProps, setValue, focus } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Screvi…" });
      try {
        const { data } = await post<{ data: SavedArticle }>("/articles", {
          url: values.url.trim(),
          tags: values.tags.length > 0 ? values.tags : undefined,
        });

        toast.style = Toast.Style.Success;
        toast.title = data.duplicate ? "Already in your library" : "Saved to Screvi";
        toast.message = data.duplicate ? undefined : "Screvi is fetching the article now.";
        toast.primaryAction = {
          title: "Open in Screvi",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => open(articleUrl(data.id)),
        };
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not save the link";
        toast.message =
          error instanceof ScreviError && error.status === 403
            ? "This API key has no write scope. Mint one with write access in Settings > API."
            : error instanceof Error
              ? error.message
              : undefined;
      }
    },
    initialValues: { url: argumentUrl, tags: [] },
    validation: {
      url: (value) => {
        if (!value?.trim()) return "A URL is required";
        try {
          const parsed = new URL(value.trim());
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            return "Only http and https links can be saved";
        } catch {
          return "That does not look like a URL";
        }
      },
    },
  });

  useEffect(() => {
    if (argumentUrl) return;
    let cancelled = false;
    guessUrl().then((url) => {
      if (cancelled) return;
      if (url) setValue("url", url);
      setIsPrefilling(false);
      focus("url");
    });
    return () => {
      cancelled = true;
    };
  }, [argumentUrl, setValue, focus]);

  return (
    <Form
      isLoading={isPrefilling || isLoadingTags}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Screvi" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://…" {...itemProps.url} />
      <Form.TagPicker title="Tags" placeholder="Optional" {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.name}
            title={tag.name}
            icon={{ source: Icon.Tag, tintColor: tagTint(tag) }}
          />
        ))}
      </Form.TagPicker>
      <Form.Description text="Screvi fetches and parses the page in the background. It lands in your inbox." />
    </Form>
  );
}
