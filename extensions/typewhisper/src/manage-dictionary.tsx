import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { apiDeleteJson, apiGet, errorMessage, instanceCacheKey } from "./api";
import { AddCorrectionForm, AddTermForm } from "./dictionary-forms";
import type {
  DictionaryCorrection,
  DictionaryCorrectionsResponse,
  DictionaryTermsResponse,
} from "./types";

export default function Command() {
  const terms = useCachedPromise(
    (instance: string) =>
      apiGet<DictionaryTermsResponse>(
        "/v1/dictionary/terms",
        undefined,
        instance,
      ),
    [instanceCacheKey()],
    { keepPreviousData: true },
  );
  const corrections = useCachedPromise(
    (instance: string) =>
      apiGet<DictionaryCorrectionsResponse>(
        "/v1/dictionary/corrections",
        undefined,
        instance,
      ),
    [instanceCacheKey()],
    { keepPreviousData: true },
  );

  function refresh() {
    terms.revalidate();
    corrections.revalidate();
  }

  async function confirmAndDelete(options: {
    title: string;
    message: string;
    path: string;
    body: unknown;
  }) {
    const confirmed = await confirmAlert({
      title: options.title,
      message: options.message,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    try {
      await apiDeleteJson(options.path, options.body);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
      refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: errorMessage(error, "Failed to delete"),
      });
    }
  }

  function deleteTerm(term: string) {
    return confirmAndDelete({
      title: `Delete "${term}"?`,
      message:
        "TypeWhisper will no longer pass this term to the speech engine. This cannot be undone.",
      path: "/v1/dictionary/terms",
      body: { term },
    });
  }

  function deleteCorrection(correction: DictionaryCorrection) {
    return confirmAndDelete({
      title: `Delete the correction for "${correction.original}"?`,
      message: `TypeWhisper will stop replacing it with "${correction.replacement}". This cannot be undone.`,
      path: "/v1/dictionary/corrections",
      body: { original: correction.original },
    });
  }

  const addActions = (
    <>
      <Action.Push
        title="Add Term"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<AddTermForm onAdded={refresh} />}
      />
      <Action.Push
        title="Add Correction"
        icon={Icon.Replace}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "n" },
          Windows: { modifiers: ["ctrl", "shift"], key: "n" },
        }}
        target={<AddCorrectionForm onAdded={refresh} />}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </>
  );

  const termList = terms.data?.terms ?? [];
  const correctionList = corrections.data?.corrections ?? [];
  const isLoading = terms.isLoading || corrections.isLoading;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search dictionary...">
      {termList.length === 0 && correctionList.length === 0 && !isLoading ? (
        <List.EmptyView
          title="Dictionary is empty"
          description="Add terms the speech engine should recognize, or corrections TypeWhisper applies after transcription."
          icon={Icon.Book}
          actions={<ActionPanel>{addActions}</ActionPanel>}
        />
      ) : (
        <>
          <List.Section title="Terms" subtitle={String(termList.length)}>
            {termList.map((term) => (
              <List.Item
                key={`term-${term}`}
                title={term}
                icon={Icon.Text}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={term} />
                    {addActions}
                    <Action
                      title="Delete Term"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => deleteTerm(term)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section
            title="Corrections"
            subtitle={String(correctionList.length)}
          >
            {correctionList.map((correction) => (
              <List.Item
                key={`correction-${correction.original}`}
                title={correction.original}
                subtitle={`→ ${correction.replacement}`}
                keywords={[correction.replacement]}
                icon={Icon.Replace}
                accessories={
                  correction.caseSensitive ? [{ text: "Case sensitive" }] : []
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Edit Correction"
                      icon={Icon.Pencil}
                      target={
                        <AddCorrectionForm
                          initialOriginal={correction.original}
                          initialReplacement={correction.replacement}
                          initialCaseSensitive={correction.caseSensitive}
                          onAdded={refresh}
                        />
                      }
                    />
                    {addActions}
                    <Action
                      title="Delete Correction"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => deleteCorrection(correction)}
                    />
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
