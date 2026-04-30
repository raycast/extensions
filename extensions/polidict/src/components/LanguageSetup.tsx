import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useSupportedLanguages } from "../hooks/use-supported-languages";
import type { SupportedLanguage } from "../types";
import { formatRaycastError } from "../utils";

export interface LanguageSetupProps {
  onComplete?: () => void;
  addLanguage: (languageCode: string) => Promise<void>;
  setNativeLanguage: (languageCode: string) => Promise<void>;
}

export function LanguageSetup({ onComplete, addLanguage, setNativeLanguage }: LanguageSetupProps) {
  const { supportedLanguages, isLoading } = useSupportedLanguages();
  const [learningLanguage, setLearningLanguage] = useState<string>("");
  const [nativeLanguageCode, setNativeLanguageCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!learningLanguage) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a learning language",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addLanguage(learningLanguage);

      if (nativeLanguageCode) {
        await setNativeLanguage(nativeLanguageCode);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Languages configured",
      });
      onComplete?.();
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const availableForNative = supportedLanguages.filter((l) => l.languageCode !== learningLanguage);

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      navigationTitle="Set Up Languages"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Welcome to Polidict"
        text="Before you start, please select the language you're learning and optionally your native language for translations."
      />

      <Form.Dropdown
        id="learningLanguage"
        title="Learning Language"
        info="The language you want to learn"
        value={learningLanguage}
        onChange={setLearningLanguage}
      >
        <Form.Dropdown.Item value="" title="Select a language..." />
        {supportedLanguages.map((lang: SupportedLanguage) => (
          <Form.Dropdown.Item key={lang.languageCode} value={lang.languageCode} title={lang.languageName} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="nativeLanguage"
        title="Native Language (Optional)"
        info="Your native language for translations"
        value={nativeLanguageCode}
        onChange={setNativeLanguageCode}
      >
        <Form.Dropdown.Item value="" title="None" />
        {availableForNative.map((lang: SupportedLanguage) => (
          <Form.Dropdown.Item key={lang.languageCode} value={lang.languageCode} title={lang.languageName} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
