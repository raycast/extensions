import _ from "lodash";
import {
  ActionPanel,
  Action,
  List,
  Form,
  useNavigation,
  showToast,
  Toast,
  open,
  Icon,
  getSelectedText,
} from "@raycast/api";
import { useLocalStorage, useCachedState, showFailureToast } from "@raycast/utils";

import { useEffect, useState, useCallback } from "react";
import { translate, TranslatedText, getTranslatedSentence } from "./shared-packages/translate";
import {
  SourceLangKeys,
  TargetLangKeys,
  autoKey,
  enKey,
  sourceLangOptionsRaycast,
  targetLangOptionsRaycast,
} from "./shared-packages/lang-options";

import { AuthorizationComponent, UserProfilePageGithub, UserProfilePageGoogle } from "./oauth";
import { post } from "./fetch";
import { useIsAuthenticated } from "./hooks";
import { config } from "./config";

const manageLangSetsLabel = "Manage language sets";
type LangSet = {
  sourceLangKey: string;
  targetLangKey: string;
  label: string;
  selected: boolean;
};

function useSavedLangSets() {
  const defaultLangSets: LangSet[] = [
    {
      sourceLangKey: "",
      targetLangKey: "",
      label: manageLangSetsLabel,
      selected: false,
    },
    {
      sourceLangKey: autoKey,
      targetLangKey: enKey,
      label: `${sourceLangOptionsRaycast[autoKey]} -> ${targetLangOptionsRaycast[enKey]}`,
      selected: true,
    },
  ];

  const [langSets, setLangSets] = useCachedState<LangSet[]>("savedLangSets", []);
  const { value, setValue, isLoading } = useLocalStorage<LangSet[]>("savedLangSets", defaultLangSets);

  useEffect(() => {
    if (value) {
      setLangSets(value);
    }
  }, [value]);

  const setNewValue = (newLangSets: LangSet[]) => {
    setLangSets(() => newLangSets);
    void setValue(newLangSets);
  };
  return { languageSets: langSets, setAddedLanguageSets: setNewValue, isLoading };
}

function AddLangSet() {
  const { pop } = useNavigation();
  const { languageSets, setAddedLanguageSets, isLoading } = useSavedLangSets();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.SaveDocument}
            title="Save Set"
            onSubmit={(values) => {
              const newLangSet = {
                sourceLangKey: values.sourceLang as SourceLangKeys,
                targetLangKey: values.targetLang as TargetLangKeys,
                label: `${sourceLangOptionsRaycast[values.sourceLang as SourceLangKeys]} -> ${targetLangOptionsRaycast[values.targetLang as TargetLangKeys]}`,
                selected: false,
              };
              const newLangSets = _.uniqBy([...languageSets, newLangSet], "label");
              setAddedLanguageSets(newLangSets);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="sourceLang" title="Source language" defaultValue={autoKey}>
        {_.map(sourceLangOptionsRaycast, (lang, key) => (
          <Form.Dropdown.Item key={key} value={key} title={lang} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="targetLang" title="Target language" defaultValue={enKey}>
        {_.map(targetLangOptionsRaycast, (lang, key) => (
          <Form.Dropdown.Item key={key} value={key} title={lang} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function ManageLangSets() {
  const { languageSets, setAddedLanguageSets, isLoading } = useSavedLangSets();

  const changeSelectedLangSet = (ls: LangSet) => {
    const newLangSets = _.map(languageSets, (langSet) => {
      return {
        ...langSet,
        selected: langSet.label === ls.label,
      };
    });
    setAddedLanguageSets(newLangSets);
  };

  const handleDeleteLanguageSet = (ls: LangSet) => {
    const elementToDelete = _.find(languageSets, { label: ls.label });
    const elementToDeleteIndex = _.findIndex(languageSets, { label: ls.label });

    const newLangSets = _.filter(languageSets, (langSet) => langSet.label !== ls.label);

    if (elementToDelete?.selected) {
      const newSelectedIndex =
        elementToDeleteIndex === newLangSets.length ? newLangSets.length - 1 : elementToDeleteIndex;
      setAddedLanguageSets(
        _.map(newLangSets, (langSet, index) => ({ ...langSet, selected: index === newSelectedIndex })),
      );
    } else setAddedLanguageSets(newLangSets);
  };

  return (
    <List isLoading={isLoading}>
      {_.map(languageSets, (lS) => (
        <List.Item
          key={lS.label}
          title={lS.label === manageLangSetsLabel ? "Add new language set" : lS.label}
          subtitle={lS.selected ? "Selected" : undefined}
          id={lS.label}
          actions={
            lS.label === manageLangSetsLabel ? (
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Add New Language Set" target={<AddLangSet />} />
              </ActionPanel>
            ) : (
              <ActionPanel>
                <Action
                  icon={Icon.Checkmark}
                  title="Select"
                  onAction={() => {
                    changeSelectedLangSet(lS);
                  }}
                />
                {languageSets.length > 2 && (
                  <Action
                    icon={Icon.Xmark}
                    title="Delete"
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDeleteLanguageSet(lS)}
                  />
                )}
              </ActionPanel>
            )
          }
        />
      ))}
    </List>
  );
}

function LanguagesDropdown() {
  const { push } = useNavigation();
  const { languageSets, setAddedLanguageSets, isLoading } = useSavedLangSets();
  const selected = _.find(languageSets, { selected: true });

  return (
    <List.Dropdown
      isLoading={isLoading}
      tooltip="Edit language settings"
      value={selected?.label}
      onChange={(newValue) => {
        if (newValue === manageLangSetsLabel) {
          push(<ManageLangSets />);
        } else {
          const newLangSets = _.map(languageSets, (langSet) => {
            return {
              ...langSet,
              selected: langSet.label === newValue,
            };
          });
          setAddedLanguageSets(newLangSets);
        }
      }}
    >
      {_.map(languageSets, (langSet) => (
        <List.Dropdown.Item key={`${langSet.label}`} title={`${langSet.label}`} value={`${langSet.label}`} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [translatedText, setTranslatedText] = useState<TranslatedText | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { languageSets } = useSavedLangSets();
  const isAuthenticated = useIsAuthenticated();
  const [jwt] = useCachedState<string>("jwt", "");
  const [authProvider] = useCachedState<string>("authProvider", "");
  const [userId] = useCachedState<string>("userId", "");
  const [autoPasteSelectedText, setAutoPasteSelectedText] = useCachedState<boolean>("autoPasteSelectedText", false);
  const selected = _.find(languageSets, { selected: true });

  useEffect(() => {
    void (async () => {
      try {
        if (autoPasteSelectedText) {
          const text = await getSelectedText();
          setSearchText(text || "");
        }
      } catch (err) {
        showFailureToast(err, { title: "Could not get selected text" });
        if (autoPasteSelectedText) setSearchText("");
      }
    })();
  }, [autoPasteSelectedText]);

  const debouncedTranslate = useCallback(
    _.debounce(async (text: string) => {
      try {
        setIsLoading(true);
        if (!selected?.sourceLangKey || !selected?.targetLangKey)
          return showToast({ title: "Please select source and target languages", style: Toast.Style.Failure });

        const res = await translate(selected?.sourceLangKey, selected?.targetLangKey, text);
        setTranslatedText(res);
      } catch (err) {
        showFailureToast(err, { title: "Error translating text" });
        console.error("error translating", err);
      } finally {
        setIsLoading(false);
      }
    }, 1000),
    [selected?.sourceLangKey, selected?.targetLangKey],
  );

  useEffect(() => {
    void (async () => {
      if (searchText.length === 0) {
        setTranslatedText(null);
        return;
      }
      await debouncedTranslate(searchText);
    })();
  }, [searchText, debouncedTranslate]);

  const saveTranslation = async () => {
    if (!translatedText) return;
    try {
      await post(
        "/translations/create",
        {
          ..._.omit(translatedText, ["translation"]),
          jsonText: JSON.stringify(translatedText.translation),
          userId,
        },
        jwt,
      );
      showToast({ title: "Translation saved" });
    } catch (err) {
      console.error("error saving translation", err);
      if (err instanceof Error && _.includes(err?.message, "free usage limit")) {
        showToast({
          title: "Upgrade Plan to Save",
          style: Toast.Style.Failure,
          primaryAction: {
            title: "Upgrade",
            onAction: async () => {
              await open(`${config.lpURL}/#pricing`);
            },
          },
        });
      } else showToast({ title: "Error saving translation", style: Toast.Style.Failure });
    }
  };

  const autoPasteAction = (
    <Action
      icon={Icon.ArrowRightCircleFilled}
      title={`Auto Paste Selected Text - ${autoPasteSelectedText ? "ON" : "OFF"}`}
      onAction={() => setAutoPasteSelectedText(!autoPasteSelectedText)}
      shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
    />
  );

  const itemActions = (
    <ActionPanel>
      {isAuthenticated ? (
        <Action icon={Icon.SaveDocument} title="Enter (↵) to Save and Repeat" onAction={saveTranslation} />
      ) : (
        <>
          <Action.Push
            icon={Icon.ArrowRightCircleFilled}
            title={`Connect Google Profile to Save`}
            target={<AuthorizationComponent authProvider="google" />}
          />
          <Action.Push
            icon={Icon.ArrowRightCircle}
            title={`Connect GitHub Profile to Save`}
            target={<AuthorizationComponent authProvider="github" />}
          />
        </>
      )}
      {autoPasteAction}
    </ActionPanel>
  );

  const translatedSentence = translatedText?.translation?.sentences
    ? getTranslatedSentence(translatedText?.translation?.sentences)
    : "";
  // const translation = _.get(translatedText, "translation.sentences[0].orig", "");
  return (
    <List
      searchText={searchText}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={"Type to translate..."}
      searchBarAccessory={<LanguagesDropdown />}
      throttle
      actions={
        <ActionPanel>
          {!isAuthenticated ? (
            <>
              <Action.Push
                icon={Icon.ArrowRightCircleFilled}
                title={`Connect Google Profile`}
                target={<AuthorizationComponent authProvider="google" />}
              />
              <Action.Push
                icon={Icon.ArrowRightCircle}
                title={`Connect GitHub Profile`}
                target={<AuthorizationComponent authProvider="github" />}
              />
            </>
          ) : authProvider === "github" ? (
            <Action.Push icon={Icon.Person} title={`View GitHub Profile`} target={<UserProfilePageGithub />} />
          ) : authProvider === "google" ? (
            <>
              <Action.Push icon={Icon.Person} title={`View Google Profile`} target={<UserProfilePageGoogle />} />
              <Action.OpenInBrowser icon={Icon.Globe} url={`${config.lpURL}/learn`} title="Learn & Repeat" />
            </>
          ) : null}
          {autoPasteAction}
        </ActionPanel>
      }
    >
      {isLoading ? (
        <List.EmptyView key="loading" title="Loading your Translation..." />
      ) : !translatedSentence || searchText.length === 0 ? (
        <List.EmptyView key="no-translation-found" title="No Translation Found" />
      ) : (
        <List.Section key="results" title="Results" subtitle={translatedSentence?.trans ?? ""}>
          {translatedText?.translation?.dict ? (
            _.map(translatedText?.translation?.dict, (pos, i) => (
              <SearchListItem key={pos.pos ?? i} searchResult={pos} actions={itemActions} />
            ))
          ) : (
            <List.Item title={translatedSentence?.trans ?? ""} key={0} actions={itemActions} />
          )}
        </List.Section>
      )}
    </List>
  );
}

type Pos = {
  pos?: string;
  terms?: string[];
  entry?: {
    word?: string;
    reverse_translation?: string[];
    score?: number;
  }[];
  base_form?: string;
  pos_enum?: number;
};

function SearchListItem({ searchResult, actions }: { searchResult: Pos; actions: JSX.Element }) {
  if (!searchResult.pos) return null;

  return (
    <List.Item
      subtitle={searchResult.pos}
      title={_.map(searchResult.entry, (term) => term.word).join(", ")}
      actions={actions}
    />
  );
}

export { Command };
