import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useCallback, useState } from "react";
import { buildOptionsForModel } from "./api/mimo-tts";
import { SynthesisStopAction } from "./components/synthesis-stop-action";
import { useSynthesisForm } from "./hooks/use-synthesis-form";

interface DesignVoiceFormValues extends Form.Values {
  voicePrompt: string;
  sampleText: string;
  optimizeText: boolean;
}

const VOICE_PROMPT_EXAMPLES = [
  "Young female, soft and breathy, very slow ASMR delivery with audible breathing and lip sounds.",
  "一位年迈的北方老先生，语速缓慢沉稳，嗓音略带沙哑和沧桑感，像在讲老故事。",
  "Heavy Russian accent, gruff middle-aged male, blunt and matter-of-fact.",
  "Bright bouncy slightly sing-song tone, like bursting with good news, fast pace, rising pitch at sentence ends.",
];

const DEFAULT_SAMPLE_TEXT =
  "Hello, this is a voice generated from your description. Switch the model to MiMo-V2.5-TTS for preset voices.";

export default function DesignVoice() {
  const [optimizeText, setOptimizeText] = useState(false);
  const [voicePrompt, setVoicePrompt] = useState("");
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE_TEXT);
  const { isLoading, handleStop, runSession } = useSynthesisForm();

  const handleSubmit = useCallback(
    async (values: DesignVoiceFormValues) => {
      const trimmedPrompt = values.voicePrompt.trim();
      if (!trimmedPrompt) {
        await showToast({ style: Toast.Style.Failure, title: "Voice description is required" });
        return;
      }
      const trimmedText = values.sampleText.trim();
      if (!values.optimizeText && !trimmedText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Sample text is required",
          message: "Either fill in the sample text or enable Optimize Text Preview.",
        });
        return;
      }

      await runSession({
        toastTitle: "Designing voice",
        toastMessage: "MiMo-V2.5-TTS-VoiceDesign",
        text: trimmedText,
        buildOptions: () =>
          buildOptionsForModel("mimo-v2.5-tts-voicedesign", {
            baseStylePrompt: trimmedPrompt,
            optimizeTextPreview: values.optimizeText,
          }),
        playingTitle: "Playing designed voice",
        successTitle: "Voice design complete",
        successMessage: values.optimizeText ? "Text was auto-optimized by MiMo" : undefined,
        failureTitle: "Voice design failed",
      });
    },
    [runSession],
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Design a Voice"
      actions={
        <ActionPanel>
          <Action.SubmitForm<DesignVoiceFormValues>
            title="Generate and Play"
            icon={Icon.Play}
            onSubmit={handleSubmit}
          />
          <SynthesisStopAction isLoading={isLoading} onStop={handleStop} />
          {VOICE_PROMPT_EXAMPLES.map((example, idx) => (
            <Action
              key={idx}
              title={`Insert Example ${idx + 1}`}
              icon={Icon.Wand}
              onAction={() => setVoicePrompt(example)}
            />
          ))}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Voice Design"
        text="Describe the voice you want — gender, age, timbre, pace, persona. 1–4 sentences. MiMo will synthesize the sample text in that voice. Toggle Optimize Text Preview to let MiMo rewrite the sample text for the described voice."
      />
      <Form.TextArea
        id="voicePrompt"
        title="Voice Description"
        value={voicePrompt}
        onChange={setVoicePrompt}
        placeholder="e.g., Young female, soft and breathy, slow ASMR delivery with audible breathing."
        autoFocus
      />
      <Form.TextArea
        id="sampleText"
        title="Sample Text"
        value={sampleText}
        onChange={setSampleText}
        placeholder="The text to read aloud with the designed voice."
      />
      <Form.Checkbox
        id="optimizeText"
        title="Auto-Optimize Sample Text"
        label="Let MiMo rewrite the sample text to match the voice"
        value={optimizeText}
        onChange={setOptimizeText}
        info="When enabled, you can leave Sample Text empty and MiMo will generate a fitting passage."
      />
    </Form>
  );
}
