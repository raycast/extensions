import { Action, ActionPanel, Clipboard, Detail, Form, Icon, LaunchProps, List } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";
import { fetchPage } from "./fetch-page";
import type { OpenGraph, SocialImage } from "./type";
import {
  escapeMarkdown,
  exportHtml,
  exportMarkdown,
  normalizeUrl,
  parseOpenGraph,
  previewText,
  validateOpenGraph,
} from "./util";

type State =
  | { kind: "loading" }
  | { kind: "input"; value: string; error?: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; graph: OpenGraph; finalUrl: string };

function UrlForm({
  initialValue,
  initialError,
  onSubmit,
}: {
  initialValue: string;
  initialError?: string;
  onSubmit: (url: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(initialError);
  function submit() {
    try {
      onSubmit(normalizeUrl(value));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Enter a valid URL.");
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Open Graph" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        value={value}
        error={error}
        onChange={(value) => {
          setValue(value);
          setError(undefined);
        }}
      />
      <Form.Description text="Enter a URL to preview its Open Graph and Twitter Card metadata." />
    </Form>
  );
}

function imageMarkdown(image: SocialImage): string {
  const dimensions =
    image.width || image.height
      ? `${image.width ?? "?"} × ${image.height ?? "?"} px, declared by the page`
      : "Dimensions not declared";
  return [
    image.resolvedUrl
      ? `![${escapeMarkdown(image.alt ?? "Social preview")}](<${image.resolvedUrl.replace(/[<>]/g, encodeURIComponent)}>)`
      : "Image URL is empty or invalid.",
    dimensions,
    image.alt ? escapeMarkdown(image.alt) : "",
  ].join("\n\n");
}

function Images({ images }: { images: SocialImage[] }) {
  return (
    <List isShowingDetail searchBarPlaceholder="Search images">
      {images.map((image, index) => (
        <List.Item
          key={index}
          title={`${image.source === "og" ? "Open Graph" : "Twitter"} Image ${index + 1}`}
          subtitle={image.url || "Empty URL"}
          keywords={[image.url, image.alt ?? ""]}
          detail={<List.Item.Detail markdown={imageMarkdown(image)} />}
          actions={
            image.resolvedUrl ? (
              <ActionPanel>
                <Action.OpenInBrowser title="Open Image in Browser" url={image.resolvedUrl} />
                <Action.CopyToClipboard title="Copy Absolute Image URL" content={image.resolvedUrl} />
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
    </List>
  );
}

function Preview({
  graph,
  requestedUrl,
  finalUrl,
  onEdit,
  onRetry,
}: {
  graph: OpenGraph;
  requestedUrl: string;
  finalUrl: string;
  onEdit: () => void;
  onRetry: () => void;
}) {
  const { title, description } = previewText(graph);
  const image =
    graph.images.find((image) => image.source === "og" && image.resolvedUrl) ??
    graph.images.find((image) => image.resolvedUrl);
  const issues = validateOpenGraph(graph);
  const validation = issues.length
    ? issues.map((issue) => `- ${issue}`).join("\n")
    : "All four required Open Graph properties are present with valid URL values.";
  const markdown = [
    image ? imageMarkdown(image) : "No social preview image declared.",
    `## ${escapeMarkdown(title ?? "Untitled page")}`,
    escapeMarkdown(description ?? "No description declared."),
    escapeMarkdown(new URL(finalUrl).hostname),
    graph.tags.length ? "" : "No Open Graph or Twitter Card tags found. Showing standard page metadata.",
  ].join("\n\n");
  return (
    <Detail
      navigationTitle="Social Preview"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Final URL" text={finalUrl} target={finalUrl} />
          {requestedUrl !== finalUrl && (
            <Detail.Metadata.Link title="Requested URL" text={requestedUrl} target={requestedUrl} />
          )}
          <Detail.Metadata.Label
            title="OG Validation"
            text={issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"}` : "Passed basic checks"}
          />
          <Detail.Metadata.Label title="Images" text={String(graph.images.length)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Page Title" text={graph.title ?? "Not declared"} />
          <Detail.Metadata.Label title="Page Description" text={graph.description ?? "Not declared"} />
          {["og:", "twitter:"].map((prefix) => (
            <Fragment key={prefix}>
              <Detail.Metadata.Separator />
              {graph.tags
                .filter((tag) => tag.name.startsWith(prefix))
                .map((tag, index) => (
                  <Detail.Metadata.Label key={index} title={tag.name} text={tag.content || "Empty"} />
                ))}
            </Fragment>
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {title && <Action.CopyToClipboard title="Copy Title" content={title} />}
            {description && <Action.CopyToClipboard title="Copy Description" content={description} />}
            <Action.OpenInBrowser title="Open Page in Browser" url={finalUrl} />
            {image?.resolvedUrl && (
              <Action.CopyToClipboard title="Copy Absolute Image URL" content={image.resolvedUrl} />
            )}
            {image?.resolvedUrl && (
              <Action.OpenInBrowser title="Open Preview Image in Browser" url={image.resolvedUrl} />
            )}
            {graph.images.length > 0 && (
              <Action.Push title="Browse Images" icon={Icon.Image} target={<Images images={graph.images} />} />
            )}
            <Action.Push
              title="Validate Open Graph"
              icon={Icon.CheckCircle}
              target={
                <Detail
                  markdown={`# Basic Open Graph validation\n\n${validation}\n\nChecks og:title, og:type, og:image, and og:url. Image reachability and platform-specific requirements are not checked.`}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Export">
            <Action.CopyToClipboard
              title="Copy All as JSON"
              content={JSON.stringify({ requestedUrl, finalUrl, ...graph }, null, 2)}
            />
            <Action.CopyToClipboard title="Copy All as Markdown" content={exportMarkdown(graph, finalUrl)} />
            <Action.CopyToClipboard title="Copy as HTML Meta Tags" content={exportHtml(graph)} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Page">
            <Action title="Edit URL" icon={Icon.Pencil} onAction={onEdit} shortcut={{ modifiers: ["cmd"], key: "e" }} />
            <Action
              title="Refresh Metadata"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Metadata">
            {graph.tags
              .filter((tag) => tag.content)
              .map((tag, index) => (
                <Action.CopyToClipboard key={index} title={`Copy ${tag.name}`} content={tag.content} />
              ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command({ arguments: { url } }: LaunchProps<{ arguments: { url?: string } }>) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pageUrl, setPageUrl] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      let input = url?.trim() ?? "";
      if (!input) {
        try {
          const clipboard = (await Clipboard.readText())?.trim() ?? "";
          if (/^(https?:\/\/|\/\/|localhost(?::|\/|$)|[^/\s]+\.[^/\s]+)/i.test(clipboard)) input = clipboard;
        } catch {
          // Clipboard access is optional; the URL form remains available.
        }
      }
      if (cancelled) return;
      if (!input) {
        setState({ kind: "input", value: "" });
        return;
      }
      try {
        setPageUrl(normalizeUrl(input));
      } catch (error) {
        setState({ kind: "input", value: input, error: error instanceof Error ? error.message : "Enter a valid URL." });
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!pageUrl) return;
    const controller = new AbortController();
    setState({ kind: "loading" });
    async function load(url: string) {
      try {
        const { html, finalUrl } = await fetchPage(url, controller.signal);
        if (!controller.signal.aborted) setState({ kind: "ready", graph: parseOpenGraph(html, finalUrl), finalUrl });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "Could not load this page. Check the URL and try again.",
          });
      }
    }
    void load(pageUrl);
    return () => controller.abort();
  }, [pageUrl, attempt]);

  function edit() {
    setPageUrl(undefined);
    setState({ kind: "input", value: pageUrl ?? "" });
  }
  function submit(url: string) {
    setState({ kind: "loading" });
    setPageUrl(url);
  }
  const retry = () => setAttempt((attempt) => attempt + 1);

  switch (state.kind) {
    case "input":
      return <UrlForm initialValue={state.value} initialError={state.error} onSubmit={submit} />;
    case "loading":
      return <Detail isLoading markdown="Loading social metadata…" />;
    case "error":
      return (
        <Detail
          markdown={`# Could not load page\n\n${escapeMarkdown(state.message)}`}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
              <Action title="Edit URL" icon={Icon.Pencil} onAction={edit} />
            </ActionPanel>
          }
        />
      );
    case "ready":
      return (
        <Preview
          graph={state.graph}
          requestedUrl={pageUrl ?? state.finalUrl}
          finalUrl={state.finalUrl}
          onEdit={edit}
          onRetry={retry}
        />
      );
  }
}
