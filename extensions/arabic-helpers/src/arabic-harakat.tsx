import {
  Action,
  ActionPanel,
  AI,
  Application,
  environment,
  Form,
  getFrontmostApplication,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ClipboardHistorySubmenu } from "./components/clipboard-history-submenu";
import { readClipboardText } from "./lib/clipboard";
import {
  containsArabicHarakat,
  createHarakatPrompt,
  deriveHarakatPair,
  isValidHarakatResult,
  updatePlainTextPreservingHarakat,
} from "./lib/conversions";
import { getInitialText } from "./lib/initial-text";

type HarakatPreferences = {
  preloadTextAutomatically: boolean;
  enableAIHarakat: boolean;
};

type ActiveField = "with" | "without";

export default function ArabicHarakat() {
  const preferences = getPreferenceValues<HarakatPreferences>();
  const withHarakatRef = useRef<Form.TextArea>(null);
  const withoutHarakatRef = useRef<Form.TextArea>(null);
  const [withHarakat, setWithHarakat] = useState("");
  const [withoutHarakat, setWithoutHarakat] = useState("");
  const [focusedField, setFocusedField] = useState<ActiveField>("with");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [frontmostApplication, setFrontmostApplication] = useState<Application>();

  const hasAIAccess = environment.canAccess(AI);
  const canGenerateHarakat = preferences.enableAIHarakat && hasAIAccess;

  useEffect(() => {
    let isCancelled = false;

    getInitialText(preferences.preloadTextAutomatically)
      .then((text) => {
        if (isCancelled) return;

        const hasHarakat = containsArabicHarakat(text) || text.includes("ٱ");
        const pair = deriveHarakatPair(text);
        setWithHarakat(pair.withHarakat);
        setWithoutHarakat(pair.withoutHarakat);
        setFocusedField(hasHarakat || text.length === 0 ? "with" : "without");

        setTimeout(() => {
          if (hasHarakat || text.length === 0) {
            withHarakatRef.current?.focus();
          } else {
            withoutHarakatRef.current?.focus();
          }
        }, 0);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [preferences.preloadTextAutomatically]);

  useEffect(() => {
    getFrontmostApplication().then(setFrontmostApplication).catch(console.error);
  }, []);

  const clear = () => {
    setWithHarakat("");
    setWithoutHarakat("");
    setFocusedField("with");
    withHarakatRef.current?.focus();
  };

  const pasteClipboardIntoWithHarakat = async () => {
    const text = await readClipboardText();
    if (text === undefined) return;

    const pair = deriveHarakatPair(text);
    setWithHarakat(pair.withHarakat);
    setWithoutHarakat(pair.withoutHarakat);
    setFocusedField("with");
    setTimeout(() => withHarakatRef.current?.focus(), 0);
  };

  const pasteClipboardIntoWithoutHarakat = async () => {
    const text = await readClipboardText();
    if (text === undefined) return;

    const pair = updatePlainTextPreservingHarakat({ withHarakat, withoutHarakat }, text);
    setWithoutHarakat(pair.withoutHarakat);
    setFocusedField("without");
    setTimeout(() => withoutHarakatRef.current?.focus(), 0);
  };

  const addHarakatWithAI = async () => {
    if (withoutHarakat.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to diacritize",
        message: "Enter plain Arabic text first.",
      });
      return;
    }

    setIsGenerating(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding Arabic harakat",
    });

    try {
      const generatedText = await AI.ask(createHarakatPrompt(withoutHarakat), { creativity: "none" });

      if (!isValidHarakatResult(withoutHarakat, generatedText)) {
        toast.style = Toast.Style.Failure;
        toast.title = "AI changed the source text";
        toast.message = "The generated result was rejected to protect the original wording and formatting.";
        return;
      }

      const pair = deriveHarakatPair(generatedText);
      setWithHarakat(pair.withHarakat);
      setWithoutHarakat(pair.withoutHarakat);
      setFocusedField("with");
      toast.style = Toast.Style.Success;
      toast.title = "Added Arabic harakat";
      withHarakatRef.current?.focus();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add Arabic harakat";
      toast.message = error instanceof Error ? error.message : "Raycast AI returned an unknown error.";
    } finally {
      setIsGenerating(false);
    }
  };

  const aiAction = canGenerateHarakat ? (
    <Action title="Add Harakat with AI" icon={Icon.Stars} onAction={addHarakatWithAI} />
  ) : undefined;

  const pasteTitle = frontmostApplication ? `Paste in ${frontmostApplication.name}` : "Paste in Active App";
  const pasteIcon = frontmostApplication ? { fileIcon: frontmostApplication.path } : Icon.Clipboard;

  const chooseRecentClipboard = (text: string) => {
    if (focusedField === "with") {
      const pair = deriveHarakatPair(text);
      setWithHarakat(pair.withHarakat);
      setWithoutHarakat(pair.withoutHarakat);
      setTimeout(() => withHarakatRef.current?.focus(), 0);
    } else {
      const pair = updatePlainTextPreservingHarakat({ withHarakat, withoutHarakat }, text);
      setWithoutHarakat(pair.withoutHarakat);
      setTimeout(() => withoutHarakatRef.current?.focus(), 0);
    }
  };

  const actions = (
    <ActionPanel>
      <ClipboardHistorySubmenu
        targetLabel={focusedField === "with" ? "With Harakat" : "Without Harakat"}
        onSelect={chooseRecentClipboard}
      />
      <ActionPanel.Section title="With Harakat">
        {withHarakat.length > 0 ? (
          <Action.CopyToClipboard title="Copy Text with Harakat" content={withHarakat} />
        ) : (
          <Action title="Nothing to Copy" icon={Icon.Warning} />
        )}
        <Action
          title="Paste Clipboard into with Harakat"
          icon={Icon.Clipboard}
          onAction={pasteClipboardIntoWithHarakat}
        />
        {withHarakat.length > 0 ? <Action.Paste title={pasteTitle} icon={pasteIcon} content={withHarakat} /> : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Without Harakat">
        {aiAction}
        {withoutHarakat.length > 0 ? (
          <Action.CopyToClipboard title="Copy Text Without Harakat" content={withoutHarakat} />
        ) : (
          <Action title="Nothing to Copy" icon={Icon.Warning} />
        )}
        <Action
          title="Paste Clipboard into Without Harakat"
          icon={Icon.Clipboard}
          onAction={pasteClipboardIntoWithoutHarakat}
        />
        {withoutHarakat.length > 0 ? (
          <Action.Paste title={pasteTitle} icon={pasteIcon} content={withoutHarakat} />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action title="Clear Both Areas" icon={Icon.Eraser} onAction={clear} />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <Form isLoading={isLoading || isGenerating} actions={actions}>
      <Form.TextArea
        id="withHarakat"
        ref={withHarakatRef}
        title="With Harakat"
        placeholder="مثال: بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ"
        info="Arabic combining marks are removed from the area below in real time."
        value={withHarakat}
        onFocus={() => {
          setFocusedField("with");
        }}
        onChange={(text) => {
          const pair = deriveHarakatPair(text);
          setWithHarakat(pair.withHarakat);
          setWithoutHarakat(pair.withoutHarakat);
        }}
      />
      <Form.TextArea
        id="withoutHarakat"
        ref={withoutHarakatRef}
        title="Without Harakat"
        placeholder="مثال: بسم الله الرحمن الرحيم"
        info="Editing plain text leaves the marked area untouched until Add Harakat with AI is explicitly run."
        value={withoutHarakat}
        onFocus={() => {
          setFocusedField("without");
        }}
        onChange={(text) => {
          const pair = updatePlainTextPreservingHarakat({ withHarakat, withoutHarakat }, text);
          setWithoutHarakat(pair.withoutHarakat);
        }}
      />
      {preferences.enableAIHarakat && !hasAIAccess ? (
        <Form.Description text="Add Harakat with AI is enabled, but this Raycast account does not currently have AI access." />
      ) : null}
    </Form>
  );
}
