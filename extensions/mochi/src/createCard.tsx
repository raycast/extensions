import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { DecksResponse, FormFieldsData } from "./types";
import * as LocalStorage from "./lib/LocalStorage";
import DeckSwitchActions from "./components/DeckSwitchActions";
import DeckDropDown from "./components/DeckDropdown";
import FormFields from "./components/DeckFields";
import { fetchFormDataAndCache, fetchDecksAndCache, postCard } from "./lib/mochiClient";
import { ACTIVE_DECKS_KEY } from "./constants";
import ErrorMessageView from "./components/ErrorMessageView";

type Values = {
  [key: string]: string;
};

const isRefetchNeeded = (cachedTime: number) => {
  return cachedTime < new Date().getTime() - 1000 * 60 * 5;
};
export default function Command() {
  const [deckId, setDeckId] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasError) {
      showToast(Toast.Style.Failure, "Failed to fetch data");
    }
  }, [hasError]);

  // fetch active decks
  const {
    isLoading: isLoadingDecks,
    data: decksData,
    error: fetchDecksError,
  } = useCachedPromise(
    async () => {
      const cached = await LocalStorage.getItem<DecksResponse["docs"]>(ACTIVE_DECKS_KEY);
      if (cached) {
        if (isRefetchNeeded(cached.createdAt)) {
          fetchDecksAndCache().catch(() => {
            setHasError(true);
          });
        }
        return cached.value;
      }
      return await fetchDecksAndCache();
    },
    [],
    { initialData: [] }
  );

  useEffect(() => {
    if (!isLoadingDecks && decksData?.[0]?.id) {
      setDeckId(decksData?.[0]?.id);
    }
  }, [decksData]);

  // fetch form data
  const {
    isLoading: isLoadingField,
    data: formData,
    error: fetchFormDataError,
  } = useCachedPromise(
    async (deckId: string) => {
      if (!deckId) return { fields: [] };

      const cached = await LocalStorage.getItem<FormFieldsData>(deckId);
      // If cached, return cached data and fetch new data in background
      if (cached) {
        if (isRefetchNeeded(cached.createdAt)) {
          fetchFormDataAndCache(deckId).catch(() => {
            setHasError(true);
          });
        }
        return cached.value;
      }
      return await fetchFormDataAndCache(deckId);
    },
    [deckId],
    {
      initialData: { fields: [] },
      execute: deckId !== "",
    }
  );

  const fieldsRefs = useRef<(Form.TextField | Form.TextArea | Form.Checkbox)[]>([]);

  const handleSubmit = async (values: Values) => {
    if (!formData) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading card...",
    });

    try {
      await postCard(values, formData as FormFieldsData);
      toast.style = Toast.Style.Success;
      toast.title = "Card created successfully 🎉";

      const activeFields = fieldsRefs.current.filter((field) => field);
      activeFields.forEach((field) => field.reset());
      activeFields[0].focus();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to create card. ${error}}`;
    }
  };

  const removeAllCache = async () => {
    await LocalStorage.removeAllItems();
  };

  const isLoading = isLoadingDecks || isLoadingField || !deckId;
  const hasAnyError = fetchDecksError || fetchFormDataError || hasError;

  return (
    <>
      {hasAnyError ? (
        <ErrorMessageView message="Failed to fetch data. Please check your API key." />
      ) : (
        <Form
          isLoading={isLoading}
          actions={
            <ActionPanel>
              <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Plus} title="Create Card" />
              <Action.OpenInBrowser url="https://app.mochi.cards" icon={Icon.Book} title="Open Mochi in Browser" />
              {!isLoading && <DeckSwitchActions decks={decksData} onSubmit={(id) => setDeckId(id)} />}
              <Action.SubmitForm
                onSubmit={removeAllCache}
                icon={Icon.Eraser}
                title="Clear Cache"
                shortcut={{ modifiers: ["cmd"], key: `d` }}
              />
            </ActionPanel>
          }
        >
          {!isLoadingDecks && (
            <>
              <DeckDropDown decks={decksData} deckId={deckId} onChange={(id) => setDeckId(id)} />
              <Form.Separator />
              {!isLoadingField && <FormFields fields={formData.fields} fieldsRefs={fieldsRefs} />}
            </>
          )}
        </Form>
      )}
    </>
  );
}
