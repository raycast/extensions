/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

import {
  getAvailableWindowsLanguages,
  getWindowsRecognitionLanguage,
  setWindowsRecognitionLanguage,
  type WindowsRecognizerLanguage,
} from "@/core/ocr/windows";

const AUTOMATIC_LANGUAGE: WindowsRecognizerLanguage = {
  tag: "auto",
  displayName: "Automatic (Windows profile)",
};

export default function Command() {
  return process.platform === "win32" ? <WindowsLanguageList /> : <WindowsOnlyNotice />;
}

function WindowsOnlyNotice() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title="Windows Only"
        description="OCR language selection applies to OCR Translate on Windows. On macOS, text recognition uses Apple Vision and detects the language automatically."
      />
    </List>
  );
}

function WindowsLanguageList() {
  const [languages, setLanguages] = useState<WindowsRecognizerLanguage[]>([]);
  const [selected, setSelected] = useState("auto");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    Promise.all([getAvailableWindowsLanguages(), getWindowsRecognitionLanguage()])
      .then(([available, saved]) => {
        setLanguages(available);
        setSelected(saved);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Windows OCR languages could not be loaded.");
        return showFailureToast(error, { title: "Could not load Windows OCR languages" });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const select = async (language: WindowsRecognizerLanguage) => {
    try {
      await setWindowsRecognitionLanguage(language.tag);
      setSelected(language.tag);
      await showToast(Toast.Style.Success, `Recognition language set to ${language.displayName}`);
    } catch (error) {
      await showFailureToast(error, { title: "Could not save recognition language" });
    }
  };

  const tagsMatch = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();
  const selectedIsUnavailable = selected !== "auto" && !languages.some((language) => tagsMatch(language.tag, selected));
  const items = isLoading ? [] : [AUTOMATIC_LANGUAGE, ...languages];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed OCR languages">
      {loadError ? (
        <List.EmptyView icon={Icon.Warning} title="Windows OCR Languages Unavailable" description={loadError} />
      ) : !isLoading && languages.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="No Windows OCR Languages Found"
          description="Install an OCR language pack in Windows Settings, then reopen this command."
        />
      ) : (
        <>
          {selectedIsUnavailable ? (
            <List.Section title="Unavailable Selection">
              <List.Item
                icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                title={selected}
                subtitle="This selected OCR language pack is not installed."
                accessories={[{ text: "Selected" }]}
              />
            </List.Section>
          ) : null}
          <List.Section title="Windows Recognition Language">
            {items.map((language) => (
              <List.Item
                key={language.tag}
                title={language.displayName}
                subtitle={language.tag === "auto" ? undefined : language.tag}
                keywords={[language.tag]}
                accessories={
                  tagsMatch(selected, language.tag)
                    ? [
                        {
                          icon: {
                            source: Icon.Checkmark,
                            tintColor: Color.Green,
                          },
                        },
                      ]
                    : []
                }
                actions={
                  <ActionPanel>
                    <Action title="Use Recognition Language" icon={Icon.Checkmark} onAction={() => select(language)} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
