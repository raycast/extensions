import { ActionPanel, Action, Form, Clipboard, Icon, closeMainWindow } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";

// LONG FORM ITEM TOOLTIP STRINGS //

const natSpeechInfo = `Natural speech replaces line breaks with a single space between words and removes hyphens and line breaks at the end of a line.

—— Input ——
Hey, who's that
person over the-
re?

—— Output ——
Hey, who's that person over there?`;

const keepDoubleInfo = `If preserve paragraphs is active, single line breaks will be removed. Multiple line breaks will be converted to double line breaks.

—— Input ——
First line.
Second line.

Third line.


Fourth line.

—— Output ——
First line. Second line.

Third line.

Fourth line.`;

const outerWhitespaceInfo =
  "Outer whitespace trimming is overridden if both line breaks and inner whitespace are not kept.";

// MAIN LOGIC //

function trimParagraphs(text: string, mode: "trimLeading" | "trimTrailing" | "trimBoth") {
  const paragraphs = text.split("\n");
  const trimmed = paragraphs.map((p) => {
    if (mode === "trimLeading") return p.trimStart();
    if (mode === "trimTrailing") return p.trimEnd();
    if (mode === "trimBoth") return p.trim();
    return p;
  });
  return trimmed.join("\n");
}

function squeeze(
  text: string,
  rmLineBreaks: string,
  keepDouble: boolean,
  innerWhitespace: string,
  outerWhitespace: string,
) {
  // OUTER WHITESPACE HANDLING FIRST
  switch (outerWhitespace) {
    case "trimLeading":
    case "trimTrailing":
    case "trimBoth":
      text = trimParagraphs(text, outerWhitespace);
      break;
  }

  // LINE BREAK HANDLING
  if (rmLineBreaks === "rm") {
    text = keepDouble
      ? text.replace(/\n{1,}/g, (match) => (match.length >= 2 ? "\n\n" : ""))
      : text.replace(/\n+/g, "");
  } else if (rmLineBreaks === "natSpeech") {
    text = text.replace(/-\n/g, ""); // remove hyphen+newline
    text = keepDouble
      ? text.replace(/\n{1,}/g, (match) => (match.length >= 2 ? "\n\n" : " "))
      : text.replace(/\n+/g, " ");
  }

  // INNER WHITESPACE HANDLING
  if (innerWhitespace === "rm") {
    text = text.replace(/(\S)[ \t\r\f\v]+(?=\S)/g, "$1");
  } else if (innerWhitespace === "natSpeech") {
    text = text.replace(/(\S)[ \t\r\f\v]+(?=\S)/g, "$1 ");
  }

  return text;
}

// FORM TYPE VALIDATION //

interface SqueezeFormValues {
  input: string;
  output: string;
  rmLineBreaks: string;
  keepDouble: boolean;
  innerWhitespace: string;
  outerWhitespace: string;
}

// MAIN FORM //

export default function Main() {
  const { handleSubmit, itemProps, values, setValue } = useForm<SqueezeFormValues>({
    onSubmit: async (values) => {
      try {
        await Clipboard.paste(values.output);
      } catch (error) {
        console.error("Failed to paste text:", error);
      }
    },
    validation: {
      input: FormValidation.Required,
    },
    initialValues: {
      input: "",
      output: "",
      rmLineBreaks: "keep",
      keepDouble: false,
      innerWhitespace: "keep",
      outerWhitespace: "keep",
    },
  });

  useEffect(() => {
    const newOutput = squeeze(
      values.input,
      values.rmLineBreaks,
      values.keepDouble,
      values.innerWhitespace,
      values.outerWhitespace,
    );
    setValue("output", newOutput);
  }, [values.input, values.rmLineBreaks, values.keepDouble, values.innerWhitespace, values.outerWhitespace, setValue]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Insert Output" icon={Icon.Syringe} onSubmit={handleSubmit} />

          <Action.CopyToClipboard
            content={values.output}
            title="Copy Output"
            shortcut={{ modifiers: ["ctrl"], key: "c" }}
            icon={Icon.Clipboard}
          />

          <Action
            title="Copy, Paste & Close"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["ctrl"], key: "v" }}
            onAction={async () => {
              await Clipboard.copy(values.output);
              await Clipboard.paste(values.output);
              await closeMainWindow();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.input} title="Input" placeholder="Type here" autoFocus={true} />

      <Form.Dropdown {...itemProps.rmLineBreaks} title="Line Breaks" info={natSpeechInfo} storeValue={true}>
        <Form.Dropdown.Item value="keep" title="Keep Line Breaks" icon={Icon.Paragraph} />
        <Form.Dropdown.Item value="rm" title="Remove Line Breaks" icon={Icon.ArrowsContract} />
        <Form.Dropdown.Item value="natSpeech" title="Use Natural Speech" icon={Icon.Wand} />
      </Form.Dropdown>

      <Form.Checkbox {...itemProps.keepDouble} label="Preserve paragraphs?" info={keepDoubleInfo} storeValue={true} />

      <Form.Dropdown {...itemProps.innerWhitespace} title="Inner Whitespace" storeValue={true}>
        <Form.Dropdown.Item value="keep" title="Keep Inner Whitespace" icon={Icon.Ellipsis} />
        <Form.Dropdown.Item value="rm" title="Remove Inner Whitespace" icon={Icon.Minus} />
        <Form.Dropdown.Item value="natSpeech" title="Natural Speech" icon={Icon.Wand} />
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.outerWhitespace}
        title="Outer Whitespace"
        storeValue={true}
        info={outerWhitespaceInfo}
      >
        <Form.Dropdown.Item value="keep" title="Keep Outer Whitespace" icon={Icon.Dot} />
        <Form.Dropdown.Item value="trimLeading" title="Trim Leading Whitespace" icon={Icon.ArrowLeft} />
        <Form.Dropdown.Item value="trimTrailing" title="Trim Trailing Whitespace" icon={Icon.ArrowRight} />
        <Form.Dropdown.Item value="trimBoth" title="Trim Leading & Trailing Whitespace" icon={Icon.Switch} />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        {...itemProps.output}
        title="Preview"
        placeholder="Read-only"
        onChange={() => {}} // Prevent user modifications
      />
    </Form>
  );
}
