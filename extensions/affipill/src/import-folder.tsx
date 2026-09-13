import {
  Action,
  ActionPanel,
  AI,
  environment,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { basename } from "path";
import { existsSync } from "fs";
import { useState } from "react";
import { pathToFileURL } from "url";
import { improveImportWithAi } from "./ai-import";
import { isAudioFile, isImageFile, matchKindLabel } from "./filenames";
import {
  collectImportPaths,
  draftsToTrackInputs,
  ImportDraft,
  prepareFileImport,
  unusedCoverPaths,
} from "./folder-import";
import { addTracks } from "./library";

const USE_AI_STORAGE_KEY = "import-use-ai";

type ImportTracksProps = {
  onSaved: () => void;
  preferAi?: boolean;
};

type ImportSession = {
  drafts: ImportDraft[];
  coverPaths: string[];
};

type FilesFormValues = {
  items?: string[];
  useAi?: boolean;
};

type DraftFormValues = {
  title: string;
  subtitle?: string;
  coverChoice?: string;
  cover?: string[];
};

export function ImportFolder({ onSaved, preferAi = false }: ImportTracksProps) {
  const { pop } = useNavigation();
  const [session, setSession] = useState<ImportSession | null>(null);

  if (!session) {
    return (
      <FilesPickerForm
        preferAi={preferAi}
        onPrepared={(nextSession) => {
          setSession(nextSession);
        }}
      />
    );
  }

  return (
    <ImportPreview
      session={session}
      onSessionChange={setSession}
      onImported={() => {
        onSaved();
        setSession(null);
        pop();
      }}
    />
  );
}

function FilesPickerForm({
  onPrepared,
  preferAi,
}: {
  onPrepared: (session: ImportSession) => void;
  preferAi: boolean;
}) {
  const [audioError, setAudioError] = useState<string | undefined>();
  const [isMatching, setIsMatching] = useState(false);
  const canUseAi = environment.canAccess(AI);
  const { data: storedUseAi } = usePromise(async () => {
    const value = await LocalStorage.getItem<string>(USE_AI_STORAGE_KEY);
    return value === "true";
  }, []);
  const [useAi, setUseAi] = useState<boolean | undefined>();
  const useAiValue = useAi ?? (preferAi || storedUseAi) ?? false;

  async function handleSubmit(values: FilesFormValues) {
    setAudioError(undefined);

    const selected = values.items ?? [];
    const shouldUseAi = values.useAi ?? useAiValue;

    if (selected.length === 0) {
      setAudioError("Choose audio files, cover images, or a folder.");
      return;
    }

    setIsMatching(true);
    try {
      await LocalStorage.setItem(USE_AI_STORAGE_KEY, shouldUseAi ? "true" : "false");
      await showToast({
        style: Toast.Style.Animated,
        title: shouldUseAi ? "Matching tracks with AI..." : "Matching tracks...",
      });
      const paths = await collectImportPaths(selected);
      const coverPaths = paths.filter((path) => isImageFile(path));
      const audioPaths = paths.filter((path) => isAudioFile(path));

      if (audioPaths.length === 0) {
        setAudioError("Choose at least one audio file.");
        return;
      }

      let drafts = prepareFileImport(paths);
      if (shouldUseAi) {
        try {
          drafts = await improveImportWithAi(drafts, coverPaths);
        } catch (error) {
          await showFailureToast(error, { title: "AI matching failed, using filename matches" });
        }
      }

      const matchedCount = drafts.filter((draft) => draft.coverPath).length;
      await showToast({
        style: Toast.Style.Success,
        title: `Prepared ${drafts.length} tracks`,
        message: matchedCount === drafts.length ? "Every track has a cover" : `${matchedCount} covers matched`,
      });
      onPrepared({ drafts, coverPaths });
    } catch (error) {
      await showFailureToast(error, { title: "Could not match files" });
    } finally {
      setIsMatching(false);
    }
  }

  return (
    <Form
      isLoading={isMatching}
      navigationTitle={preferAi ? "Add Tracks Via AI" : "Import Tracks"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Match Tracks" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Match with AI"
            icon={Icon.Stars}
            onSubmit={(values: FilesFormValues) => handleSubmit({ ...values, useAi: true })}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="items"
        title="Tracks and Covers"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
        error={audioError}
        info="Select audio files and cover images together, or a folder that contains both. Matching uses similar filenames."
      />
      <Form.Checkbox
        id="useAi"
        title="AI"
        label="Improve titles and cover matching with AI"
        value={useAiValue}
        onChange={setUseAi}
        info={
          canUseAi
            ? "Uses Raycast AI to clean filenames into titles and match covers when names differ."
            : "Requires Raycast Pro. You will be asked to upgrade if you turn this on."
        }
      />
    </Form>
  );
}

function ImportPreview({
  session,
  onSessionChange,
  onImported,
}: {
  session: ImportSession;
  onSessionChange: (session: ImportSession) => void;
  onImported: () => void;
}) {
  const [isImporting, setIsImporting] = useState(false);
  const leftoverCovers = unusedCoverPaths(session.drafts, session.coverPaths);

  async function handleImproveWithAi() {
    if (isImporting) {
      return;
    }

    setIsImporting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Improving import with AI..." });
      const drafts = await improveImportWithAi(session.drafts, session.coverPaths);
      onSessionChange({ ...session, drafts });
      await showToast({ style: Toast.Style.Success, title: "AI updated titles and covers" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not improve import" });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleImport() {
    if (isImporting) {
      return;
    }

    if (session.drafts.length === 0) {
      await showFailureToast("No tracks left to import.", { title: "Nothing to import" });
      return;
    }

    setIsImporting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: `Adding ${session.drafts.length} tracks...` });
      await addTracks(draftsToTrackInputs(session.drafts));
      await showToast({
        style: Toast.Style.Success,
        title: session.drafts.length === 1 ? "Track added" : `${session.drafts.length} tracks added`,
      });
      onImported();
    } catch (error) {
      await showFailureToast(error, { title: "Could not add tracks" });
    } finally {
      setIsImporting(false);
    }
  }

  function updateDraft(id: string, values: Partial<ImportDraft>) {
    onSessionChange({
      ...session,
      drafts: session.drafts.map((draft) => (draft.id === id ? { ...draft, ...values } : draft)),
    });
  }

  function removeDraft(id: string) {
    onSessionChange({
      ...session,
      drafts: session.drafts.filter((draft) => draft.id !== id),
    });
  }

  return (
    <List
      isLoading={isImporting}
      isShowingDetail
      navigationTitle="Review Import"
      searchBarPlaceholder="Filter tracks..."
    >
      <List.EmptyView
        icon={Icon.Tray}
        title="No tracks to import"
        description="Go back and choose audio and cover files, or add a single track instead."
      />
      {session.drafts.map((draft) => {
        const coverExists = Boolean(draft.coverPath && existsSync(draft.coverPath));

        return (
          <List.Item
            key={draft.id}
            icon={coverExists && draft.coverPath ? draft.coverPath : Icon.Music}
            title={draft.title}
            subtitle={draft.subtitle}
            accessories={[{ tag: matchKindLabel(draft.matchKind) }]}
            detail={
              <List.Item.Detail
                markdown={coverExists && draft.coverPath ? `![](${pathToFileURL(draft.coverPath).href})` : undefined}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={draft.title} />
                    <List.Item.Detail.Metadata.Label title="Description" text={draft.subtitle} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Audio" text={basename(draft.audioPath)} />
                    <List.Item.Detail.Metadata.Label
                      title="Cover"
                      text={draft.coverPath ? basename(draft.coverPath) : "None"}
                    />
                    <List.Item.Detail.Metadata.Label title="Match" text={matchKindLabel(draft.matchKind)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Import All" icon={Icon.Plus} onAction={() => void handleImport()} />
                  <Action.Push
                    title="Edit Track"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <EditDraftForm
                        draft={draft}
                        leftoverCovers={leftoverCovers}
                        onSave={(values) => updateDraft(draft.id, values)}
                      />
                    }
                  />
                  <Action
                    title="Improve with AI"
                    icon={Icon.Stars}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={() => void handleImproveWithAi()}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Remove from Import"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => removeDraft(draft.id)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function EditDraftForm({
  draft,
  leftoverCovers,
  onSave,
}: {
  draft: ImportDraft;
  leftoverCovers: string[];
  onSave: (values: Partial<ImportDraft>) => void;
}) {
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string | undefined>();
  const coverChoices = [draft.coverPath, ...leftoverCovers].filter((path): path is string => Boolean(path));

  function handleSubmit(values: DraftFormValues) {
    const title = values.title.trim();
    if (!title) {
      setTitleError("Title is required.");
      return;
    }

    const pickedCover = values.cover?.[0];
    const chosenCover =
      pickedCover || (values.coverChoice && values.coverChoice !== "none" ? values.coverChoice : undefined);
    const coverChanged = chosenCover !== draft.coverPath;

    onSave({
      title,
      subtitle: values.subtitle?.trim() || title,
      coverPath: chosenCover,
      matchKind: chosenCover ? (coverChanged ? "manual" : draft.matchKind) : "none",
    });
    pop();
  }

  return (
    <Form
      navigationTitle="Edit Track"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={draft.title} error={titleError} autoFocus />
      <Form.TextArea id="subtitle" title="Description" defaultValue={draft.subtitle} />
      {coverChoices.length > 0 && (
        <Form.Dropdown id="coverChoice" title="Cover" defaultValue={draft.coverPath ?? "none"}>
          <Form.Dropdown.Item value="none" title="No cover" />
          {coverChoices.map((path) => (
            <Form.Dropdown.Item key={path} value={path} title={basename(path)} icon={path} />
          ))}
        </Form.Dropdown>
      )}
      <Form.FilePicker
        id="cover"
        title="Other Cover"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        info="Optional. Pick another image if the matching cover is missing."
      />
    </Form>
  );
}
