import { Form } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getBibleData, getLanguages } from "youversion-suggest";
import {
  getPreferredLanguage,
  getPreferredLineBreaksSetting,
  getPreferredReferenceFormat,
  getPreferredVerseNumbersSetting,
  getPreferredVersion,
  setPreferredLanguage,
  setPreferredLineBreaksSetting,
  setPreferredReferenceFormat,
  setPreferredVerseNumbersSetting,
  setPreferredVersion,
} from "./preferences";
import { BibleLanguage, BibleLanguageId, BibleVersion, BibleVersionId } from "./types";
import { isReferenceFormatValid } from "./utilities";

export default function Command() {
  const {
    state,
    onChangeLanguage,
    onChangeVersion,
    onChangeReferenceFormat,
    onChangeVerseNumbersSetting,
    onChangeLineBreaksSetting,
  } = usePreferences();

  const [referenceFormatError, setReferenceFormatError] = useState<string | undefined>();

  async function validateReferenceFormat(newFormat: string): Promise<void> {
    if (isReferenceFormatValid(newFormat)) {
      setReferenceFormatError(undefined);
    } else {
      setReferenceFormatError("Format is invalid; see field info for proper usage");
    }
  }

  return (
    <Form isLoading={state.isLoading}>
      {state.currentLanguage !== undefined ? (
        <Form.Dropdown
          id="language"
          title="Language"
          info="The language to use for Bible references and their content"
          value={state.currentLanguage}
          onChange={onChangeLanguage}
        >
          {state.languageOptions.map((language) => {
            return <Form.Dropdown.Item key={language.id} value={language.id} title={language.name} />;
          })}
        </Form.Dropdown>
      ) : null}
      {state.currentVersion !== undefined ? (
        <Form.Dropdown
          id="version"
          title="Version"
          info="The version/translation to use for Bible references and their content; this list is different depending on your selected language"
          value={String(state.currentVersion)}
          onChange={onChangeVersion}
        >
          {state.versionOptions.map((version) => {
            return <Form.Dropdown.Item key={String(version.id)} value={String(version.id)} title={version.name} />;
          })}
        </Form.Dropdown>
      ) : null}
      {state.currentReferenceFormat !== undefined ? (
        <Form.TextArea
          id="refformat"
          title="Reference Format"
          info="The format used for copied Bible content; blank lines are allowed, e.g.

{name} ({version})
{content}"
          placeholder="e.g. {name} ({version})
{content}"
          error={referenceFormatError}
          value={state.currentReferenceFormat}
          onChange={(newValue) => {
            validateReferenceFormat(newValue);
            onChangeReferenceFormat(newValue);
          }}
        />
      ) : null}
      {state.currentVerseNumbersSetting !== undefined ? (
        <Form.Checkbox
          id="versenumbers"
          label="Include Verse Numbers in Content?"
          info="Whether or not to include verse numbers in copied Bible content"
          value={state.currentVerseNumbersSetting}
          onChange={onChangeVerseNumbersSetting}
        />
      ) : null}
      {state.currentLineBreaksSetting !== undefined ? (
        <Form.Checkbox
          id="linebreaks"
          label="Preserve Line Breaks in Content?"
          info="Whether or not to preserve line breaks in copied Bible content"
          value={state.currentLineBreaksSetting}
          onChange={onChangeLineBreaksSetting}
        />
      ) : null}
    </Form>
  );
}

function usePreferences() {
  const [state, setState] = useState<FormState>({
    isLoading: true,
    languageOptions: [],
    currentLanguage: undefined,
    versionOptions: [],
    currentVersion: undefined,
    currentReferenceFormat: undefined,
    currentVerseNumbersSetting: undefined,
    currentLineBreaksSetting: undefined,
  });

  useEffect(() => {
    (async () => {
      const newState = await getPreferenceFormData();
      setState({ isLoading: false, ...newState });
    })();
  }, []);

  const onChangeLanguage = useCallback(async (newValue: string) => {
    await setPreferredLanguage(newValue);
    const newState = await getPreferenceFormData();
    setState({ isLoading: false, ...newState });
  }, []);

  const onChangeVersion = useCallback(async (newValue: string) => {
    await setPreferredVersion(Number(newValue));
    const newState = await getPreferenceFormData();
    setState({ isLoading: false, ...newState });
  }, []);

  const onChangeReferenceFormat = useCallback(async (newValue: string) => {
    setPreferredReferenceFormat(newValue);
    setState((currentState) => {
      return { ...currentState, isLoading: false, currentReferenceFormat: newValue };
    });
  }, []);

  const onChangeVerseNumbersSetting = useCallback(async (newValue: boolean) => {
    await setPreferredVerseNumbersSetting(newValue);
    const newState = await getPreferenceFormData();
    setState({ isLoading: false, ...newState });
  }, []);

  const onChangeLineBreaksSetting = useCallback(async (newValue: boolean) => {
    await setPreferredLineBreaksSetting(newValue);
    const newState = await getPreferenceFormData();
    setState({ isLoading: false, ...newState });
  }, []);

  return {
    state,
    onChangeLanguage,
    onChangeVersion,
    onChangeReferenceFormat,
    onChangeVerseNumbersSetting,
    onChangeLineBreaksSetting,
  };
}

async function getPreferenceFormData() {
  const languages = await getLanguages();
  const preferredLanguageId = await getPreferredLanguage();
  const preferredVersionId = await getPreferredVersion();
  const bible = await getBibleData(preferredLanguageId);
  const preferredReferenceFormat = await getPreferredReferenceFormat();
  const preferredVerseNumbersSetting = await getPreferredVerseNumbersSetting();
  const preferredLineBreaksSetting = await getPreferredLineBreaksSetting();

  return {
    languageOptions: languages,
    currentLanguage: preferredLanguageId,
    versionOptions: bible.versions,
    currentVersion: preferredVersionId,
    currentReferenceFormat: preferredReferenceFormat,
    currentVerseNumbersSetting: preferredVerseNumbersSetting,
    currentLineBreaksSetting: preferredLineBreaksSetting,
  };
}

interface FormState {
  isLoading: boolean;
  languageOptions: BibleLanguage[];
  currentLanguage: BibleLanguageId | undefined;
  versionOptions: BibleVersion[];
  currentVersion: BibleVersionId | undefined;
  currentReferenceFormat: string | undefined;
  currentVerseNumbersSetting?: boolean;
  currentLineBreaksSetting?: boolean;
}
