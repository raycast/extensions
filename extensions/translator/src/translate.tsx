import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState } from "react";
import { translateText, TranslationError } from "./openai-compatible";
import { deliverTranslation, TranslationDeliveryError } from "./translation-delivery";
import { enabledTranslationOptions, type TranslationOption } from "./translation-options";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Translate>();
  const [sourceText, setSourceText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const translationInFlight = useRef(false);
  const translationOptions = enabledTranslationOptions(preferences);

  async function translateAndInsert(option: TranslationOption) {
    if (!sourceText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter Text to Translate",
      });
      return;
    }

    if (translationInFlight.current) {
      return;
    }

    translationInFlight.current = true;
    setIsTranslating(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Translating to ${option.title}...`,
    });

    try {
      const translatedText = await translateText(sourceText, option.target, preferences);
      await deliverTranslation({
        sourceText,
        translatedText,
        target: option.target,
        model: preferences.model.trim(),
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title =
        error instanceof TranslationDeliveryError ? "Translation Could Not Be Delivered" : "Could Not Translate";
      toast.message = formatFailureMessage(error);
    } finally {
      translationInFlight.current = false;
      setIsTranslating(false);
    }
  }

  const characterCount = sourceText.length;

  return (
    <List
      filtering={false}
      isLoading={isTranslating}
      onSearchTextChange={setSourceText}
      searchBarPlaceholder="Type or paste text to translate..."
      throttle={false}
    >
      <List.EmptyView
        icon={Icon.Globe}
        title="No Target Languages Enabled"
        description="Select at least one target language in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      <List.Section
        title="Choose a Language"
        subtitle={
          characterCount > 0 ? `${characterCount} ${characterCount === 1 ? "character" : "characters"}` : undefined
        }
      >
        {translationOptions.map((option) => (
          <List.Item
            key={option.target.id}
            id={option.target.id}
            icon={option.icon}
            title={option.title}
            subtitle="Translate and paste into the active app"
            keywords={option.keywords}
            actions={
              <ActionPanel>
                <Action
                  title={`Translate to ${option.title}`}
                  icon={Icon.ArrowRight}
                  onAction={() => void translateAndInsert(option)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function formatFailureMessage(error: unknown): string {
  const message = error instanceof TranslationError || error instanceof Error ? error.message : String(error);
  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}
