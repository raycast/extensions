import React from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { ImproveTextFormErrorState, ImproveTextFormValues } from "commands/improve-text/types";
import { useCachedState } from "@raycast/utils";

export const TONE_OPTIONS = [
  {
    value: "neutral",
    title: "Neutral",
    icon: Icon.Circle,
    description: "No emotional coloring. Plain, factual, and even.",
  },
  {
    value: "professional",
    title: "Professional",
    icon: Icon.Envelope,
    description: "Business-oriented and work-focused. Clear and restrained.",
  },
  {
    value: "friendly",
    title: "Friendly",
    icon: Icon.Emoji,
    description: "Soft and approachable. Polite, without informality.",
  },
  {
    value: "formal",
    title: "Formal",
    icon: Icon.Lock,
    description: "Strictly official. Formal wording and maximum distance.",
  },
  {
    value: "informal",
    title: "Informal",
    icon: Icon.GameController,
    description: "Casual and conversational. Natural everyday language.",
  },
  {
    value: "concise",
    title: "Concise",
    icon: Icon.ShortParagraph,
    description: "As short as possible. Removes redundancy and filler.",
  },
  {
    value: "polite",
    title: "Polite",
    icon: Icon.Heart,
    description: "Respectful and tactful. Softens sharp phrasing.",
  },
  {
    value: "confident",
    title: "Confident",
    icon: Icon.CloudLightning,
    description: "Direct and assertive. No hedging or over-softening.",
  },
];

type ImproveTextFormProps = {
  isImproving: boolean;
  errorState: ImproveTextFormErrorState | null;
  onSubmit: (values: ImproveTextFormValues) => void;
};

export const ImproveTextForm: React.FC<ImproveTextFormProps> = ({ isImproving, errorState, onSubmit }) => {
  const [tone, setTone] = useCachedState<string>("optimizePrompt.mode", "");
  const [disableAgentStyleFormatting, setDisableAgentStyleFormatting] = useCachedState<boolean>(
    "improveText.disableAgentStyleFormatting",
    false,
  );

  const selectedToneOption = TONE_OPTIONS.find((option) => option.value === tone);

  return (
    <Form
      isLoading={isImproving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={errorState ? Icon.Repeat : Icon.Stars}
            title={errorState ? "Retry" : "Improve"}
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      {selectedToneOption && <Form.Description text={selectedToneOption.description} title=" " />}

      <Form.Dropdown
        id="tone"
        title="Tone"
        value={tone}
        onChange={setTone}
        info="Select the desired tone for the improved text."
        storeValue
      >
        <Form.Dropdown.Item key="preserve" value="" title="Keep original tone" icon={Icon.Tack} />
        {TONE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="sourceText"
        title="Input"
        placeholder="Paste the text you want to improve"
        enableMarkdown
        autoFocus
      />

      <Form.Separator />

      <Form.TextArea
        id="instructions"
        title="Instructions"
        placeholder="For example: Keep it very short..."
        info="Provide any specific instructions for improving the text."
      />

      <Form.Checkbox
        info="Avoid smart quotes, em dashes, ellipsis characters, and special spaces."
        id="disableAgentStyleFormatting"
        label="Disable agent-style formatting"
        defaultValue={false}
        value={disableAgentStyleFormatting}
        onChange={setDisableAgentStyleFormatting}
      />
    </Form>
  );
};
