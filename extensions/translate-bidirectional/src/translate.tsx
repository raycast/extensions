import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  Detail,
  environment,
  getPreferenceValues,
  getSelectedText,
} from "@raycast/api";
import { useAI } from "@raycast/utils";
import { useEffect, useState } from "react";

function buildPrompt(
  primary: string,
  secondary: string,
  input: string,
  isHtml: boolean,
): string {
  return `You are a translator.

Detect the language of the input below.
- If it is already in ${primary}, translate it to ${secondary}.
- Otherwise (any other source language), translate it to ${primary}.

The input is ${isHtml ? "HTML" : "plain text"}. Keep the original formatting and
structure, rendering the translation as clean GitHub-flavored Markdown:
- Use Markdown headings, bullet/numbered lists, tables, code blocks, links, and
  blank lines between paragraphs to mirror the source layout.
${
  isHtml
    ? "- Convert the HTML structure faithfully into the equivalent Markdown."
    : "- Preserve line breaks and list structure as they appear in the text."
}
- Keep code, symbols, URLs, and placeholders unchanged.

Translate the meaning faithfully; only restructure formatting — never add,
remove, or summarize content.
Return ONLY the translated Markdown, with no surrounding quotes, labels, or commentary.

Input:
${input}`;
}

export default function Command() {
  const { primaryLanguage, secondaryLanguage } =
    getPreferenceValues<Preferences>();
  const hasAI = environment.canAccess(AI);

  const [input, setInput] = useState("");
  const [inputIsHtml, setInputIsHtml] = useState(false);
  const [isLoadingInput, setIsLoadingInput] = useState(true);
  const [emptyInput, setEmptyInput] = useState(false);

  useEffect(() => {
    (async () => {
      // Whitespace-insensitive comparison, used to tell whether the clipboard
      // holds the same content the user has selected.
      const normalize = (value: string) => value.replace(/\s+/g, "");

      let selected = "";
      try {
        selected = (await getSelectedText())?.trim() ?? "";
      } catch {
        // No selection or the app doesn't support it.
      }

      let clipText = "";
      let clipHtml = "";
      try {
        const clip = await Clipboard.read();
        clipText = clip.text?.trim() ?? "";
        clipHtml = clip.html?.trim() ?? "";
      } catch {
        // Clipboard unavailable — fall back to the selection only.
      }

      // Plain selections lose their layout, so prefer the clipboard's rich HTML
      // whenever it holds the content we're translating.
      if (selected) {
        if (
          clipHtml &&
          clipText &&
          normalize(clipText) === normalize(selected)
        ) {
          setInput(clipHtml);
          setInputIsHtml(true);
        } else {
          setInput(selected);
        }
      } else if (clipHtml) {
        setInput(clipHtml);
        setInputIsHtml(true);
      } else if (clipText) {
        setInput(clipText);
      } else {
        setEmptyInput(true);
      }

      setIsLoadingInput(false);
    })();
  }, []);

  const {
    data,
    isLoading: isTranslating,
    error,
  } = useAI(
    buildPrompt(primaryLanguage, secondaryLanguage, input, inputIsHtml),
    {
      execute: hasAI && input.length > 0,
      creativity: "low",
      model: AI.Model["Anthropic_Claude_Haiku_4.5"],
      stream: true,
    },
  );

  if (!hasAI) {
    return (
      <Detail
        markdown={
          "## Raycast AI is required\n\nThis command needs a Raycast plan with AI access."
        }
      />
    );
  }

  if (emptyInput) {
    return (
      <Detail
        markdown={
          "## Nothing to translate\n\nSelect some text or copy it to the clipboard first."
        }
      />
    );
  }

  if (error) {
    return <Detail markdown={`## Translation failed\n\n${error.message}`} />;
  }

  const isLoading = isLoadingInput || isTranslating;
  // The model returns clean Markdown, so it renders correctly in Detail as-is.
  const markdown =
    data && data.length > 0 ? data : isLoading ? "Translating…" : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !isTranslating && data && data.length > 0 ? (
          <ActionPanel>
            <Action.Paste title="Paste Translation" content={data} />
            <Action.CopyToClipboard title="Copy Translation" content={data} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
