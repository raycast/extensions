import { useEffect, useState } from "react";
import {
  Keyboard,
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Detail,
  launchCommand,
  LaunchType,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { getSavedResumes, removeResume, SavedResume } from "./utils/storage";
import { validateResume } from "./utils/validateResume";
import { Resume } from "./types/resume";
import { makeMarkdownFromResume } from "./utils/renderResume";
import { ResumeDocument, listResumeDocuments } from "./utils/resumeDocuments";
import ResumeEditor from "./components/ResumeEditor";
import LocalResumeDetail from "./components/LocalResumeDetail";

function ResumeDetail({
  url,
  onDelete,
  onSaved,
}: {
  url: string;
  onDelete: () => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [resume, setResume] = useState<Resume | null>(null);
  const [markdown, setMarkdown] = useState<string>("# Loading...");
  const [isValidating, setIsValidating] = useState(false);

  const {
    data: fetchedData,
    isLoading: isFetching,
    error: fetchError,
  } = useFetch(url, {
    execute: true,
  });

  // Validate and render
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!fetchedData) return;
      if (isFetching) return;

      setIsValidating(true);
      try {
        // Ensure we use an object for rendering even if useFetch returned a string
        let resumeObj: Resume;
        if (typeof fetchedData === "string") {
          try {
            resumeObj = JSON.parse(fetchedData) as Resume;
          } catch {
            // leave as string; validateResume will report error
            resumeObj = fetchedData as unknown as Resume;
          }
        } else {
          resumeObj = fetchedData as Resume;
        }

        const validationResult = await validateResume(resumeObj);
        if (cancelled) return;
        if (!validationResult.valid) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Resume",
            message: "Validation failed",
          });
          setResume(null);
          setMarkdown("# Invalid Resume");
          setIsValidating(false);
          return;
        }

        // Use resumeObj as the resume object after validation
        setResume(resumeObj);
        setMarkdown(makeMarkdownFromResume(resumeObj));
      } catch (err: unknown) {
        if (cancelled) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Validating Resume",
          message: err instanceof Error ? err.message : String(err),
        });
        setResume(null);
        setMarkdown("# Error");
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchedData, isFetching]);

  // Handle fetch errors
  useEffect(() => {
    void (async () => {
      if (!fetchError) return;

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch resume",
        message: String(fetchError),
      });
      setResume(null);
      setMarkdown("# Failed to load");
      setIsValidating(false);
    })();
  }, [fetchError]);

  const loading = isFetching || isValidating;

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      navigationTitle={resume?.basics?.name || "Resume"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {resume && !loading && (
              <Action.Push
                title="Save Local Copy"
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                icon={Icon.SaveDocument}
                target={<ResumeEditor initialResume={resume} sourceUrl={url} onSaved={onSaved} />}
              />
            )}
            <Action.OpenInBrowser
              title="Open in Browser"
              shortcut={Keyboard.Shortcut.Common.Open}
              url={url}
              icon={Icon.Globe}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              shortcut={Keyboard.Shortcut.Common.Copy}
              content={url}
              icon={Icon.Clipboard}
            />
            <Action
              title="Remove Saved URL"
              shortcut={Keyboard.Shortcut.Common.Remove}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                try {
                  await onDelete();
                  pop();
                } catch (error) {
                  await showFailureToast(error, { title: "Could not remove URL" });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CreateResumeAction({ onChanged }: { onChanged: () => Promise<void> }) {
  return (
    <Action.Push
      title="Create Resume"
      shortcut={Keyboard.Shortcut.Common.New}
      icon={Icon.Plus}
      target={<ResumeEditor onSaved={onChanged} />}
      onPop={() => void onChanged()}
    />
  );
}

function OpenResumeAction() {
  return (
    <Action
      title="Open Resume"
      shortcut={Keyboard.Shortcut.Common.Open}
      icon={Icon.Globe}
      onAction={async () => {
        try {
          await launchCommand({ name: "open-resume", type: LaunchType.UserInitiated });
        } catch (err) {
          await showFailureToast(err, { title: "Failed to Open Resume command" });
        }
      }}
    />
  );
}

export default function Command() {
  const [items, setItems] = useState<SavedResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<ResumeDocument[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const [list, local] = await Promise.all([getSavedResumes(), listResumeDocuments()]);
      setItems(list);
      setDocuments(local.documents);
      setWarnings(local.warnings);
      setLoadError(undefined);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
      await showFailureToast(error, { title: "Could not load saved resumes" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(url: string) {
    await removeResume(url);
    await load();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search saved resumes...">
      {loadError && (
        <List.Item
          title="Could Not Load Saved Resumes"
          subtitle={loadError}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Retry" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={load} />
            </ActionPanel>
          }
        />
      )}
      {warnings.map((warning) => (
        <List.Item
          key={warning}
          title="Unreadable Saved Resume"
          subtitle={warning}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <CreateResumeAction onChanged={load} />
              <OpenResumeAction />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && !loadError && items.length === 0 && documents.length === 0 && (
        <List.EmptyView
          icon={Icon.Person}
          title="No Saved Resumes"
          description="Create a local resume or open a JSON Resume URL"
          actions={
            <ActionPanel>
              <CreateResumeAction onChanged={load} />
              <OpenResumeAction />
            </ActionPanel>
          }
        />
      )}
      {documents.length > 0 && (
        <List.Section title="Local Resumes">
          {documents.map((document) => (
            <List.Item
              key={document.id}
              title={document.title}
              subtitle={document.resume.basics?.name}
              icon={Icon.Document}
              keywords={[
                document.resume.basics?.name ?? "",
                document.resume.basics?.label ?? "",
                document.sourceUrl ?? "",
              ]}
              accessories={[{ date: new Date(document.updatedAt) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Resume"
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    icon={Icon.Eye}
                    target={<LocalResumeDetail document={document} onChanged={load} />}
                    onPop={() => void load()}
                  />
                  <Action.Push
                    title="Edit Resume"
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    icon={Icon.Pencil}
                    target={<ResumeEditor document={document} onSaved={load} />}
                    onPop={() => void load()}
                  />
                  <Action.CopyToClipboard
                    title="Copy JSON"
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={JSON.stringify(document.resume, null, 2)}
                  />
                  <CreateResumeAction onChanged={load} />
                  <Action
                    title="Refresh"
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    icon={Icon.ArrowClockwise}
                    onAction={load}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {items.length > 0 && (
        <List.Section title="Saved URLs">
          {items.map((item) => (
            <List.Item
              key={item.url}
              title={item.title || "Untitled Resume"}
              subtitle={item.title ? item.url : undefined}
              icon={Icon.Person}
              accessories={[
                {
                  text: item.lastFetched ? new Date(item.lastFetched).toLocaleDateString() : "",
                  icon: Icon.Calendar,
                },
                { icon: Icon.Globe, tooltip: item.url },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Resume"
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    icon={Icon.Eye}
                    target={
                      <ResumeDetail
                        url={item.url}
                        onSaved={load}
                        onDelete={async () => {
                          await handleDelete(item.url);
                        }}
                      />
                    }
                  />
                  <CreateResumeAction onChanged={load} />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    shortcut={Keyboard.Shortcut.Common.Open}
                    url={item.url}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={item.url}
                  />
                  <Action
                    title="Remove Saved URL"
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      try {
                        await handleDelete(item.url);
                      } catch (error) {
                        await showFailureToast(error, { title: "Could not remove URL" });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
