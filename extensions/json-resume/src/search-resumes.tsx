import { useEffect, useState } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Detail, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { getSavedResumes, removeResume, SavedResume } from "./utils/storage";
import { validateResume } from "./utils/validateResume";
import { Resume } from "./types/resume";
import { makeMarkdownFromResume } from "./utils/renderResume";

function ResumeDetail({ url, onDelete }: { url: string; onDelete: () => void }) {
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
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Validating Resume",
          message: err instanceof Error ? err.message : String(err),
        });
        setResume(null);
        setMarkdown("# Error");
      } finally {
        setIsValidating(false);
      }
    })();
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
            <Action.OpenInBrowser title="Open in Browser" url={url} icon={Icon.Globe} />
            <Action.CopyToClipboard title="Copy URL" content={url} icon={Icon.Clipboard} />
            <Action
              title="Delete from Saved"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={onDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [items, setItems] = useState<SavedResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    const list = await getSavedResumes();
    setItems(list);
    setIsLoading(false);
  }

  async function handleDelete(url: string) {
    await removeResume(url);
    await load();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search saved resumes...">
      {!isLoading && items.length === 0 && (
        <List.EmptyView
          icon={Icon.Person}
          title="No Saved Resumes"
          description="Open a resume first using the 'Open Resume' command to save it"
          actions={
            <ActionPanel>
              <Action
                title="Open Resume"
                icon={Icon.Globe}
                onAction={async () => {
                  try {
                    await launchCommand({ name: "open-resume", type: LaunchType.UserInitiated });
                  } catch (err) {
                    await showFailureToast(err, { title: "Failed to Open Resume command" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      )}
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
                icon={Icon.Eye}
                target={
                  <ResumeDetail
                    url={item.url}
                    onDelete={async () => {
                      await handleDelete(item.url);
                    }}
                  />
                }
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                url={item.url}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
              <Action.CopyToClipboard title="Copy URL" content={item.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => void handleDelete(item.url)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
