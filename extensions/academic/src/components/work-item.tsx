import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { loadLibraryNames, saveWork } from "../lib/library";
import type { AccessLink, WorkResult } from "../types";
import { CitationActions } from "./citation-actions";
import { fileURLToPath } from "node:url";

export function WorkItem({
  work,
  savedActions,
  suppressAccess = false,
  onFindSources,
}: {
  work: WorkResult;
  savedActions?: { onEdit: () => void; onRemove: () => void };
  suppressAccess?: boolean;
  onFindSources?: () => void;
}) {
  const accessLinks = suppressAccess
    ? []
    : work.accessLinks.filter(
        (link) => link.kind !== "purchase" && link.kind !== "institution",
      );
  const purchaseLinks = suppressAccess
    ? []
    : work.accessLinks.filter((link) => link.kind === "purchase");
  const primaryLink = accessLinks[0];
  const authorText = work.authors.join(", ") || "Unknown author";
  const preferences = getPreferenceValues<Preferences>();
  const institutionalLink =
    !suppressAccess && preferences.openUrlResolver
      ? makeOpenUrl(work, preferences.openUrlResolver)
      : undefined;

  return (
    <List.Item
      id={work.id}
      title={work.title}
      subtitle={[authorText, work.year].filter(Boolean).join(" · ")}
      icon={work.coverUrl ? { source: work.coverUrl } : Icon.Book}
      detail={
        <WorkDetail
          work={suppressAccess ? { ...work, accessLinks: [] } : work}
        />
      }
      actions={
        <ActionPanel>
          {onFindSources ? (
            <ActionPanel.Section title="Access">
              <Action
                title="Find Sources"
                icon={Icon.MagnifyingGlass}
                onAction={onFindSources}
              />
            </ActionPanel.Section>
          ) : null}
          {primaryLink ? (
            <ActionPanel.Section title="Best Available Option">
              <AccessAction link={primaryLink} />
            </ActionPanel.Section>
          ) : null}
          {accessLinks.length ? (
            <ActionPanel.Section title="All Sources">
              {accessLinks.slice(primaryLink ? 1 : 0).map((link) => (
                <AccessAction key={link.url} link={link} />
              ))}
            </ActionPanel.Section>
          ) : null}
          {purchaseLinks.length ? (
            <ActionPanel.Section title="Buy in Selected Countries">
              {purchaseLinks.map((link) => (
                <AccessAction key={link.url} link={link} />
              ))}
            </ActionPanel.Section>
          ) : null}
          {institutionalLink ? (
            <ActionPanel.Section title="Institutional Access">
              <Action.OpenInBrowser
                title="Check My Library"
                url={institutionalLink}
                icon={Icon.Building}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Research Library">
            <SaveToLibraryAction work={work} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {work.identifiers.doi ? (
              <Action.CopyToClipboard
                title="Copy DOI"
                content={work.identifiers.doi}
              />
            ) : null}
            {work.identifiers.isbn?.[0] ? (
              <Action.CopyToClipboard
                title="Copy ISBN"
                content={work.identifiers.isbn[0]}
              />
            ) : null}
            <Action.CopyToClipboard title="Copy Title" content={work.title} />
          </ActionPanel.Section>
          <CitationActions work={work} />
          {savedActions ? (
            <ActionPanel.Section title="Saved Work">
              <Action
                title="Edit Collection and Tags"
                icon={Icon.Pencil}
                onAction={savedActions.onEdit}
              />
              <Action
                title="Remove from Library"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={savedActions.onRemove}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export function SaveToLibraryAction({ work }: { work: WorkResult }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Save to Library…"
      icon={Icon.Bookmark}
      onAction={() => push(<SaveToLibraryForm work={work} />)}
    />
  );
}

function SaveToLibraryForm({ work }: { work: WorkResult }) {
  const { pop } = useNavigation();
  const [libraries, setLibraries] = useState<string[]>(["Reading List"]);
  useEffect(() => {
    void loadLibraryNames().then(setLibraries);
  }, []);
  return (
    <Form
      navigationTitle="Save to Library"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Work"
            icon={Icon.Bookmark}
            onSubmit={async (values: {
              library: string;
              newLibrary: string;
              tags: string;
            }) => {
              const library =
                values.newLibrary.trim() || values.library || "Reading List";
              await saveWork(
                work,
                library,
                values.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              );
              await showToast({
                style: Toast.Style.Success,
                title: `Saved to ${library}`,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={work.title}
        text={work.authors.join(", ") || "Unknown author"}
      />
      <Form.Dropdown id="library" title="Library" defaultValue="Reading List">
        {libraries.map((library) => (
          <Form.Dropdown.Item key={library} value={library} title={library} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="newLibrary"
        title="Or Create Library"
        placeholder="Research project, thesis, course…"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="methodology, read, chapter 2"
      />
    </Form>
  );
}

function AccessAction({ link }: { link: AccessLink }) {
  if (link.url.startsWith("file://")) {
    const path = fileURLToPath(link.url);
    return (
      <Action.Open
        title={`${link.label} [${link.source}]`}
        target={path}
        icon={Icon.Document}
      />
    );
  }
  const icon =
    link.kind === "download"
      ? Icon.Download
      : link.kind === "borrow"
        ? Icon.Clock
        : Icon.Globe;
  return (
    <Action.OpenInBrowser
      title={`${link.label} [${link.source}]`}
      url={link.url}
      icon={icon}
    />
  );
}

function WorkDetail({ work }: { work: WorkResult }) {
  const markdownParts = [];
  if (work.coverUrl)
    markdownParts.push(
      `<img src="${work.coverUrl}" alt="Cover" height="220" />`,
    );
  if (work.accessLinks.length) {
    const links = work.accessLinks
      .filter((link) => link.kind !== "purchase")
      .map((link) => {
        const accessType =
          link.kind === "download"
            ? `Download${link.format ? ` ${link.format}` : ""}`
            : link.kind === "borrow"
              ? "Borrow"
              : link.kind === "read"
                ? "Read"
                : "Catalog record";
        return `- [${escapeMarkdownLabel(link.label)}](<${link.url}>) — **${escapeMarkdown(link.source)}** · ${accessType}`;
      });
    markdownParts.push(`### Repositories and Links\n\n${links.join("\n")}`);
  }
  const purchaseLinks = work.accessLinks.filter(
    (link) => link.kind === "purchase",
  );
  if (purchaseLinks.length)
    markdownParts.push(
      `### Buy in Selected Countries\n\n${purchaseLinks.map((link) => `- [${escapeMarkdownLabel(link.label)}](<${link.url}>)`).join("\n")}`,
    );
  if (work.editions && work.editions.length > 1)
    markdownParts.push(
      `### Editions and Translations\n\n${work.editions
        .slice(0, 12)
        .map(
          (edition) =>
            `- ${escapeMarkdown(edition.title ?? work.title)}${edition.year ? ` (${edition.year})` : ""}${edition.languages.length ? ` · ${edition.languages.join(", ")}` : ""}${edition.identifiers.isbn?.[0] ? ` · ISBN ${edition.identifiers.isbn[0]}` : ""}`,
        )
        .join("\n")}`,
    );
  if (work.abstract)
    markdownParts.push(
      `### Abstract\n\n${escapeMarkdown(work.abstract.slice(0, 1800))}`,
    );

  return (
    <List.Item.Detail
      markdown={markdownParts.join("\n\n") || undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={work.title} />
          <List.Item.Detail.Metadata.Label
            title="Author(s)"
            text={work.authors.join(", ") || "Unknown"}
          />
          {work.year ? (
            <List.Item.Detail.Metadata.Label
              title="Year"
              text={String(work.year)}
            />
          ) : null}
          {work.publisher ? (
            <List.Item.Detail.Metadata.Label
              title="Publisher / Journal"
              text={work.publisher}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Type" text={work.kind} />
          {work.languages?.length ? (
            <List.Item.Detail.Metadata.Label
              title="Language(s)"
              text={work.languages.join(", ")}
            />
          ) : null}
          {work.confidence ? (
            <List.Item.Detail.Metadata.Label
              title="Match confidence"
              text={work.confidence}
            />
          ) : null}
          {work.license ? (
            <List.Item.Detail.Metadata.Label
              title="License"
              text={work.license}
            />
          ) : null}
          {work.version ? (
            <List.Item.Detail.Metadata.Label
              title="Version"
              text={work.version}
            />
          ) : null}
          {work.isRetracted ? (
            <List.Item.Detail.Metadata.Label
              title="Publication warning"
              text="Retracted"
              icon={Icon.ExclamationMark}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          {work.identifiers.doi ? (
            <List.Item.Detail.Metadata.Label
              title="DOI"
              text={work.identifiers.doi}
            />
          ) : null}
          {work.identifiers.isbn?.length ? (
            <List.Item.Detail.Metadata.Label
              title="ISBN"
              text={work.identifiers.isbn.slice(0, 3).join(", ")}
            />
          ) : null}
          {work.identifiers.issn?.length ? (
            <List.Item.Detail.Metadata.Label
              title="ISSN"
              text={work.identifiers.issn.join(", ")}
            />
          ) : null}
          {work.identifiers.pmid ? (
            <List.Item.Detail.Metadata.Label
              title="PMID"
              text={work.identifiers.pmid}
            />
          ) : null}
          {(work.metadataSources?.length ?? 0) > 0 ? (
            <List.Item.Detail.Metadata.Label
              title="Metadata sources"
              text={work.metadataSources!.join(", ")}
            />
          ) : null}
          {(work.accessSources?.length ?? 0) > 0 ? (
            <List.Item.Detail.Metadata.Label
              title="Access sources"
              text={work.accessSources!.join(", ")}
            />
          ) : null}
          {!work.metadataSources?.length && !work.accessSources?.length ? (
            <List.Item.Detail.Metadata.Label
              title="Sources"
              text={work.sources.join(", ")}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Access options"
            text={String(work.accessLinks.length)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function makeOpenUrl(work: WorkResult, baseUrl: string): string {
  const params = new URLSearchParams({
    url_ver: "Z39.88-2004",
    "rft.title": work.title,
  });
  if (work.identifiers.doi)
    params.set("rft_id", `info:doi/${work.identifiers.doi}`);
  if (work.identifiers.isbn?.[0])
    params.set("rft.isbn", work.identifiers.isbn[0]);
  if (work.identifiers.issn?.[0])
    params.set("rft.issn", work.identifiers.issn[0]);
  if (work.year) params.set("rft.date", String(work.year));
  if (work.authors[0]) params.set("rft.au", work.authors[0]);
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${params}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[<>]/g, "").trim();
}

function escapeMarkdownLabel(value: string): string {
  return value.replaceAll("[", "").replaceAll("]", "").trim();
}
