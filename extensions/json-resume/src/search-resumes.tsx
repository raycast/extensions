/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getSavedResumes, removeResume, SavedResume } from "./utils/storage";
import { validateResume } from "./utils/validateResume";

function makeMarkdownFromResume(resume: any) {
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
    profiles.forEach((p: any) => lines.push(`- ${p.network ? `${p.network}` : p.username || p.url}: ${p.url}`));
  }

  // Skills
  const skills = resume?.skills || [];
  if (skills.length) {
    lines.push("---");
    lines.push(`## Skills`);
    skills.forEach((s: any) => {
      const keywords = (s.keywords || []).slice(0, 8).join(", ");
      lines.push(`- **${s.name || "Skill"}** — ${keywords}`);
    });
  }

  // Work
  const work = resume?.work || [];
  if (work.length) {
    lines.push("---");
    lines.push(`## Work Experience`);
    work.forEach((w: any) => {
      lines.push(`\n### ${w.position || "(position)"} — ${w.company || "(company)"}`);
      const dates = `${w.startDate || ""}${w.endDate ? ` — ${w.endDate}` : ""}`.trim();
      if (dates) lines.push(`*${dates}*`);
      if (w.summary) lines.push(`\n${w.summary}`);
      const highlights = w.highlights || [];
      if (highlights.length) {
        lines.push(`\n**Highlights**`);
        highlights.forEach((h: any) => lines.push(`- ${h}`));
      }
    });
  }

  // Education
  const education = resume?.education || [];
  if (education.length) {
    lines.push("---");
    lines.push(`## Education`);
    education.forEach((e: any) => {
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
    languages.forEach((l: any) => lines.push(`- ${l.language} — ${l.fluency || ""}`));
  }

  return lines.join("\n\n");
}

function ResumeDetail({ url, onDelete }: { url: string; onDelete: () => void }) {
  const [resume, setResume] = useState<any | null>(null);
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
        let resumeObj: any = fetchedData;
        if (typeof fetchedData === "string") {
          try {
            resumeObj = JSON.parse(fetchedData);
          } catch {
            // leave as string; validateResume will report error
          }
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
      } catch (err: any) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Validating Resume",
          message: String(err?.message || err),
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
      <List.EmptyView
        icon={Icon.Person}
        title="No Saved Resumes"
        description="Open a resume first using the 'Open Resume' command to save it"
      />
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
