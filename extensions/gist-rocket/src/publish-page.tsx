import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { withGitHub } from "./lib/github";
import { publish, afterPublish } from "./lib/publish";
import { detectKind, suggestedTitle } from "./lib/html";
import { Theme } from "./lib/render";

type KindChoice = "auto" | "html" | "markdown";

function PublishPage() {
  const prefs = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<KindChoice>("auto");
  const [visibility, setVisibility] = useState<"secret" | "public">(
    (prefs.defaultVisibility as "secret" | "public") ?? "secret",
  );
  const [theme, setTheme] = useState<Theme>((prefs.defaultMarkdownTheme as Theme) ?? "light");
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Clipboard.readText().then((text) => {
      if (cancelled) return;
      const t = text ?? "";
      setContent(t);
      if (t) setDescription((d) => d || suggestedTitle(t, "Untitled page"));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit() {
    if (!content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to publish",
        message: "Paste some HTML or Markdown first.",
      });
      return;
    }
    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Publishing…" });
    try {
      const resolvedKind = kind === "auto" ? detectKind(content) : kind;
      const result = await publish({
        kind: resolvedKind,
        source: content,
        description: description.trim() || suggestedTitle(content, "Untitled page"),
        visibility,
        theme,
      });
      await toast.hide();
      await afterPublish(result);
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Publish failed",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={!loaded || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Publish Page" icon={Icon.Rocket} onSubmit={onSubmit} />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const t = (await Clipboard.readText()) ?? "";
              setContent(t);
              if (t && !description) setDescription(suggestedTitle(t, "Untitled page"));
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Title"
        placeholder="A short title for this page"
        value={description}
        onChange={setDescription}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Paste HTML or Markdown…"
        value={content}
        onChange={setContent}
        enableMarkdown={false}
      />
      <Form.Dropdown id="kind" title="Format" value={kind} onChange={(v) => setKind(v as KindChoice)}>
        <Form.Dropdown.Item value="auto" title="Auto-detect" icon={Icon.Wand} />
        <Form.Dropdown.Item value="html" title="HTML" icon={Icon.Code} />
        <Form.Dropdown.Item value="markdown" title="Markdown" icon={Icon.Document} />
      </Form.Dropdown>
      <Form.Dropdown
        id="visibility"
        title="Visibility"
        value={visibility}
        onChange={(v) => setVisibility(v as "secret" | "public")}
      >
        <Form.Dropdown.Item value="secret" title="Secret (unlisted)" icon={Icon.EyeDisabled} />
        <Form.Dropdown.Item value="public" title="Public" icon={Icon.Eye} />
      </Form.Dropdown>
      <Form.Dropdown
        id="theme"
        title="Markdown Theme"
        value={theme}
        onChange={(v) => setTheme(v as Theme)}
        info="Used when content is Markdown. Ignored for HTML."
      >
        <Form.Dropdown.Item value="light" title="Light" icon={Icon.Sun} />
        <Form.Dropdown.Item value="dark" title="Dark" icon={Icon.Moon} />
        <Form.Dropdown.Item value="auto" title="Auto (system)" icon={Icon.CircleProgress50} />
      </Form.Dropdown>
    </Form>
  );
}

export default withGitHub(PublishPage);
