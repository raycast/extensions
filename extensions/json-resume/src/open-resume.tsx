import { useEffect, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Detail, Icon } from "@raycast/api";
import { validateResume } from "./utils/validateResume";
import { useFetch, useForm } from "@raycast/utils";
import { getSavedResumes, saveResume, removeResume, SavedResume } from "./utils/storage";
import { Resume, Profile, Skill, Work, Education, Language } from "./types/resume";

function makeMarkdownFromResume(resume: Resume) {
  const basics = resume?.basics || {};
  const lines: string[] = [];

  // Header with name and location
  lines.push(`# ${basics.name || "(no name)"} ${basics.location?.address ? `- ${basics.location.address}` : ""}`);
  if (basics.label) lines.push(`**${basics.label}**`);

  const contact: string[] = [];
  if (basics.email) contact.push(`Email: ${basics.email}`);
  if (basics.phone) contact.push(`Phone: ${basics.phone}`);
  if (basics.website) contact.push(`Website: ${basics.website}`);
  if (contact.length) lines.push(contact.join(" • "));

  // separator
  if (basics.summary || contact.length || basics.label) lines.push("---");

  if (basics.summary) {
    lines.push(`${basics.summary}`);
  }

  // Profiles
  const profiles = basics.profiles || [];
  if (profiles.length) {
    lines.push("---");
    lines.push(`**Profiles**`);
    profiles.forEach((p: Profile) => lines.push(`- ${p.network ? `${p.network}` : p.username || p.url}: ${p.url}`));
  }

  // Skills
  const skills = resume?.skills || [];
  if (skills.length) {
    lines.push("---");
    lines.push(`## Skills`);
    skills.forEach((s: Skill) => {
      const keywords = (s.keywords || []).slice(0, 8).join(", ");
      lines.push(`- **${s.name || "Skill"}** — ${keywords}`);
    });
  }

  // Work
  const work = resume?.work || [];
  if (work.length) {
    lines.push("---");
    lines.push(`## Work Experience`);
    work.forEach((w: Work) => {
      lines.push(`\n### ${w.position || "(position)"} — ${w.company || "(company)"}`);
      const dates = `${w.startDate || ""}${w.endDate ? ` — ${w.endDate}` : ""}`.trim();
      if (dates) lines.push(`*${dates}*`);
      if (w.summary) lines.push(`\n${w.summary}`);
      const highlights = w.highlights || [];
      if (highlights.length) {
        lines.push(`\n**Highlights**`);
        highlights.forEach((h: string) => lines.push(`- ${h}`));
      }
    });
  }

  // Education
  const education = resume?.education || [];
  if (education.length) {
    lines.push("---");
    lines.push(`## Education`);
    education.forEach((e: Education) => {
      lines.push(`\n**${e.institution || "(institution)"}** — ${e.area || ""}`);
      const edDates = `${e.startDate || ""}${e.endDate ? ` — ${e.endDate}` : ""}`.trim();
      if (edDates) lines.push(`*${edDates}*`);
      if (e.gpa) lines.push(`- GPA: ${e.gpa}`);
    });
  }

  // Languages
  const languages = resume?.languages || [];
  if (languages.length) {
    lines.push("---");
    lines.push(`## Languages`);
    languages.forEach((l: Language) => lines.push(`- ${l.language} — ${l.fluency || ""}`));
  }

  return lines.join("\n\n");
}

export default function Command() {
  // savedList is the persisted saved URLs; inputUrl is the current form value
  const [savedList, setSavedList] = useState<SavedResume[]>([]);
  const [inputUrl, setInputUrl] = useState<string>("");
  const [fetchUrl, setFetchUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [markdown, setMarkdown] = useState<string>("# Hello World");
  const [isValidating, setIsValidating] = useState(false);

  const {
    data: fetchedData,
    isLoading: isFetching,
    revalidate,
    error: fetchError,
  } = useFetch(fetchUrl || "", {
    execute: fetchUrl !== null && fetchUrl.length > 0,
  });

  async function handleSubmit(values: { url: string }) {
    const urlToFetch = values.url?.trim();
    if (!urlToFetch) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a URL",
      });
      return;
    }

    // trigger fetch via useFetch
    setFetchUrl(urlToFetch);
    // keep the inputUrl in sync
    setInputUrl(urlToFetch);
    // mark validation running; actual validation will run when fetchedData updates
    setIsValidating(true);
  }

  // Save the current input URL to LocalStorage (explicit action)
  async function saveCurrentUrl() {
    const urlToSave = currentUrl ?? inputUrl;
    if (!urlToSave) {
      await showToast({ style: Toast.Style.Failure, title: "No URL to save" });
      return;
    }
    try {
      // Use the current resume name if available, otherwise fetch it
      let title: string | undefined = resume?.basics?.name;
      if (!title) {
        try {
          const r = await fetch(urlToSave);
          if (r.ok) {
            const j = (await r.json()) as Resume;
            title = j?.basics?.name;
          }
        } catch {
          // ignore errors fetching title
        }
      }
      await saveResume(urlToSave, title);
      const list = await getSavedResumes();
      setSavedList(list);
      await showToast({ style: Toast.Style.Success, title: "Saved URL" });
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save URL",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function clearSavedUrl() {
    try {
      const urlToRemove = currentUrl ?? inputUrl;
      if (!urlToRemove) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No URL to clear",
        });
        return;
      }
      await removeResume(urlToRemove);
      const list = await getSavedResumes();
      setSavedList(list);
      await showToast({
        style: Toast.Style.Success,
        title: "Cleared saved URL",
      });
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear URL",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Preload saved list on mount
  useEffect(() => {
    void (async () => {
      const list = await getSavedResumes();
      setSavedList(list);
    })();
  }, []);

  // Helper to check if current URL is saved
  const isCurrentUrlSaved = () => {
    const url = currentUrl ?? inputUrl;
    return url ? savedList.some((item) => item.url === url) : false;
  };

  // When fetchedData updates, run validation and update resume/markdown/currentUrl
  useEffect(() => {
    void (async () => {
      if (!fetchedData) return;
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

        const validated = await validateResume(resumeObj);
        if (!validated.valid) {
          // show toast with the failure and return to the input form
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation Failed",
            message: String(validated.error),
          });
          setResume(null);
          setMarkdown("# Hello World");
          setFetchUrl(null);
          setCurrentUrl(null);
          setIsValidating(false);
          return;
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Resume loaded and validated",
        });
        setResume(resumeObj);
        setMarkdown(makeMarkdownFromResume(resumeObj));
        setCurrentUrl(fetchUrl);

        // Auto-save the URL after successful validation with the person's name
        if (fetchUrl) {
          const name = resumeObj?.basics?.name;
          await saveResume(fetchUrl, name);
          const list = await getSavedResumes();
          setSavedList(list);
        }
      } catch (err: unknown) {
        // On unexpected errors, show toast and return to input screen
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Validating Resume",
          message: err instanceof Error ? err.message : String(err),
        });
        setResume(null);
        setMarkdown("# Hello World");
        setFetchUrl(null);
        setCurrentUrl(null);
      } finally {
        setIsValidating(false);
      }
    })();
  }, [fetchedData]);

  // If the network fetch fails, useFetch will surface an `error`.
  // Make sure we reset UI and notify the user so the UI doesn't appear stuck.
  useEffect(() => {
    void (async () => {
      if (!fetchError) return;

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch resume",
        message: String(fetchError),
      });
      setResume(null);
      setMarkdown("# Hello World");
      setFetchUrl(null);
      setCurrentUrl(null);
      setIsValidating(false);
    })();
  }, [fetchError]);

  const loading = isFetching || isValidating;

  // Use form validation - MUST be before any conditional returns (Rules of Hooks)
  const {
    handleSubmit: handleFormSubmit,
    itemProps,
    setValue,
  } = useForm<{ url: string }>({
    onSubmit: async (values) => {
      await handleSubmit(values);
    },
    initialValues: {
      url: inputUrl,
    },
    validation: {
      url: (value) => {
        // Only validate if user is trying to submit
        // Don't block auto-loading of saved resumes
        if (!value || value.trim().length === 0) {
          return "URL is required";
        }
        try {
          new URL(value);
        } catch {
          return "Please enter a valid URL";
        }
      },
    },
  });

  // Sync form value with inputUrl state when inputUrl changes externally
  // (e.g., from auto-loading saved resumes or launching from search)
  useEffect(() => {
    if (inputUrl && itemProps.url.value !== inputUrl) {
      setValue("url", inputUrl);
    }
  }, [inputUrl, setValue]);

  // Show Detail when we have a resume OR when a fetch/validation is in progress.
  // This prevents the input `Form` from flashing briefly while the async fetch/validation completes.
  if (resume || loading) {
    return (
      <Detail
        markdown={resume ? markdown : "# Loading..."}
        isLoading={loading}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Source URL"
              url={currentUrl || (savedList[0]?.url ?? "") || ""}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <ActionPanel.Section>
              <Action
                title="Re-Fetch"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={async () => {
                  // prefer currentUrl (the last successfully fetched URL), fall back to inputUrl
                  const urlToRefetch = currentUrl ?? inputUrl;
                  if (!urlToRefetch) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "No URL to re-fetch",
                    });
                    return;
                  }
                  setFetchUrl(urlToRefetch);
                  try {
                    await revalidate();
                  } catch (e) {
                    // revalidate may throw; show a toast
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Re-fetch failed",
                      message: String(e),
                    });
                  }
                }}
              />
              {isCurrentUrlSaved() ? (
                <Action
                  title="Unsave URL"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => void clearSavedUrl()}
                />
              ) : (
                <Action
                  title="Save URL"
                  icon={Icon.SaveDocument}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => void saveCurrentUrl()}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Open Resume"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open URL" onSubmit={handleFormSubmit} />
          <ActionPanel.Section>
            {isCurrentUrlSaved() ? (
              <Action
                title="Unsave URL"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => void clearSavedUrl()}
              />
            ) : (
              <Action
                title="Save URL"
                icon={Icon.SaveDocument}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => void saveCurrentUrl()}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.url}
        title="Resume JSON URL"
        placeholder="https://example.com/resume.json"
        autoFocus
      />
    </Form>
  );
}
