import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import type { SupportedLanguage } from "../types";
import { formatRaycastError } from "../utils";

export interface CurrentLanguageActionsProps {
  languages: SupportedLanguage[];
  currentLanguage?: SupportedLanguage;
  nativeLanguage?: SupportedLanguage;
  supportedLanguages?: SupportedLanguage[];
  isLoadingSupportedLanguages?: boolean;
  setCurrentLanguage: (language: SupportedLanguage) => Promise<void>;
  addLanguage?: (languageCode: string) => Promise<void>;
  removeLanguage?: (languageCode: string) => Promise<void>;
  setNativeLanguage?: (languageCode: string) => Promise<void>;
  removeNativeLanguage?: () => Promise<void>;
  onLanguageChanged?: () => void;
}

export function CurrentLanguageActions({
  languages,
  currentLanguage,
  nativeLanguage,
  supportedLanguages = [],
  isLoadingSupportedLanguages = false,
  setCurrentLanguage,
  addLanguage,
  removeLanguage,
  setNativeLanguage,
  removeNativeLanguage,
  onLanguageChanged,
}: CurrentLanguageActionsProps) {
  if (!currentLanguage) {
    return null;
  }

  const selectedLanguage = currentLanguage;
  const hasAlternativeLanguage = languages.some((language) => language.languageCode !== selectedLanguage.languageCode);
  const availableLanguagesToAdd = supportedLanguages.filter(
    (supportedLanguage) =>
      !languages.some((userLanguage) => userLanguage.languageCode === supportedLanguage.languageCode),
  );

  async function handleLanguageChange(language: SupportedLanguage) {
    if (language.languageCode === selectedLanguage.languageCode) {
      return;
    }

    try {
      await setCurrentLanguage(language);
      onLanguageChanged?.();
      showToast({
        style: Toast.Style.Success,
        title: "Study language changed",
        message: language.languageName,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to change language",
        message: formatRaycastError(error).description,
      });
    }
  }

  async function handleAddLanguage(language: SupportedLanguage) {
    if (!addLanguage) {
      return;
    }

    try {
      await addLanguage(language.languageCode);
      onLanguageChanged?.();
      showToast({
        style: Toast.Style.Success,
        title: "Study language added",
        message: language.languageName,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add language",
        message: formatRaycastError(error).description,
      });
    }
  }

  async function handleRemoveLanguage(language: SupportedLanguage) {
    if (!removeLanguage) {
      return;
    }

    try {
      await removeLanguage(language.languageCode);

      if (language.languageCode === selectedLanguage.languageCode) {
        const fallbackLanguage = languages.find((item) => item.languageCode !== language.languageCode);
        if (fallbackLanguage) {
          await setCurrentLanguage(fallbackLanguage);
        }
      }

      onLanguageChanged?.();
      showToast({
        style: Toast.Style.Success,
        title: "Study language removed",
        message: language.languageName,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove language",
        message: formatRaycastError(error).description,
      });
    }
  }

  async function handleNativeLanguageChange(language: SupportedLanguage) {
    if (!setNativeLanguage) {
      return;
    }

    if (language.languageCode === nativeLanguage?.languageCode) {
      return;
    }

    try {
      await setNativeLanguage(language.languageCode);
      onLanguageChanged?.();
      showToast({
        style: Toast.Style.Success,
        title: "Native language changed",
        message: language.languageName,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to change native language",
        message: formatRaycastError(error).description,
      });
    }
  }

  async function handleNativeLanguageRemoval() {
    if (!removeNativeLanguage) {
      return;
    }

    if (!nativeLanguage) {
      return;
    }

    try {
      await removeNativeLanguage();
      onLanguageChanged?.();
      showToast({
        style: Toast.Style.Success,
        title: "Native language removed",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove native language",
        message: formatRaycastError(error).description,
      });
    }
  }

  return (
    <>
      <ActionPanel.Submenu icon={Icon.Globe} title={`Study Language: ${selectedLanguage.languageName}`}>
        {languages.map((language) => (
          <Action
            key={language.languageCode}
            icon={language.languageCode === selectedLanguage.languageCode ? Icon.CheckCircle : Icon.Circle}
            title={language.languageName}
            onAction={() => handleLanguageChange(language)}
          />
        ))}
        {!hasAlternativeLanguage && (
          <Action
            icon={Icon.Info}
            title="Add Study Language"
            onAction={() =>
              showToast({
                style: Toast.Style.Failure,
                title: "No language to switch to",
                message: "Add another study language first.",
              })
            }
          />
        )}
      </ActionPanel.Submenu>

      {addLanguage && (
        <ActionPanel.Submenu icon={Icon.Plus} title="Add Study Language">
          {isLoadingSupportedLanguages && <Action icon={Icon.Clock} title="Loading Supported Languages…" />}
          {!isLoadingSupportedLanguages &&
            availableLanguagesToAdd.map((language) => (
              <Action
                key={language.languageCode}
                title={language.languageName}
                onAction={() => handleAddLanguage(language)}
              />
            ))}
          {!isLoadingSupportedLanguages && availableLanguagesToAdd.length === 0 && (
            <Action icon={Icon.Info} title="All Supported Languages Already Added" />
          )}
        </ActionPanel.Submenu>
      )}

      {removeLanguage && (
        <ActionPanel.Submenu icon={Icon.Trash} title="Remove Study Language">
          {languages.map((language) => (
            <Action
              key={language.languageCode}
              icon={Icon.Trash}
              title={
                language.languageCode === selectedLanguage.languageCode
                  ? `${language.languageName} (Current)`
                  : language.languageName
              }
              style={Action.Style.Destructive}
              onAction={() => handleRemoveLanguage(language)}
            />
          ))}
        </ActionPanel.Submenu>
      )}

      {setNativeLanguage && removeNativeLanguage && (
        <ActionPanel.Submenu icon={Icon.Pin} title={`Native Language: ${nativeLanguage?.languageName ?? "Not Set"}`}>
          <Action
            icon={nativeLanguage ? Icon.Circle : Icon.CheckCircle}
            title="Not Set"
            onAction={handleNativeLanguageRemoval}
          />
          {isLoadingSupportedLanguages && <Action icon={Icon.Clock} title="Loading Supported Languages…" />}
          {!isLoadingSupportedLanguages &&
            supportedLanguages.map((language) => (
              <Action
                key={language.languageCode}
                icon={language.languageCode === nativeLanguage?.languageCode ? Icon.CheckCircle : Icon.Circle}
                title={language.languageName}
                onAction={() => handleNativeLanguageChange(language)}
              />
            ))}
        </ActionPanel.Submenu>
      )}
    </>
  );
}
