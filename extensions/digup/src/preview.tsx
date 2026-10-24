import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { readFile } from "fs/promises";
import { basename, dirname, extname } from "path";
import { useEffect, useState } from "react";
import { bytes, excerptMarkdown, facts, imageMarkdown, kinds, passageMarkdown, reason, tilde } from "./format";
import type { DigUpService, Hit } from "./service";

/** Files small and plain enough to show whole instead of just the passage that matched. */
const plainText = new Set([".md", ".markdown", ".txt", ".csv", ".tsv", ".json", ".yaml", ".yml", ".log", ".org"]);
const wholeFileLimit = 400_000;
const shownChars = 20_000;

/** Kind, why it matched, where it lives: the same facts beside the list's preview and on the full one. */
export function HitMetadata({ hit, page }: { hit: Hit; page?: number }) {
  const kind = kinds[hit.kind] ?? kinds.doc;
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Kind">
        <Detail.Metadata.TagList.Item text={kind.title} color={kind.color} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Why" text={reason(hit)} />
      {page ? <Detail.Metadata.Label title="Showing" text={`Page ${page}`} /> : null}
      <Detail.Metadata.Label title="Folder" text={tilde(dirname(hit.path))} />
      <Detail.Metadata.Label
        title="Modified"
        text={new Date(hit.modified * 1000).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      />
      {facts(hit).map((fact) => (
        <Detail.Metadata.Label key={fact.title} title={fact.title} text={fact.text} />
      ))}
      {hit.size > 0 ? <Detail.Metadata.Label title="Size" text={bytes(hit.size)} /> : null}
    </Detail.Metadata>
  );
}

/** The full-size preview: → from a result opens it, ← goes back to the list. */
export function FullPreview({ hit, digup }: { hit: Hit; digup: DigUpService }) {
  const { pop } = useNavigation();
  const name = basename(hit.path);
  const pages = hit.info.pages ? Number(hit.info.pages) : undefined;
  const [page, setPage] = useState(hit.kind === "pdf" ? (hit.loc ?? 1) : undefined);
  const [markdown, setMarkdown] = useState<string>();
  const [loading, setLoading] = useState(true);
  const excerpt = hit.excerpt ? `> ${excerptMarkdown(hit.excerpt)}` : "";

  useEffect(() => {
    let live = true;
    setLoading(true);
    const show = (value: string) => {
      if (!live) return;
      setMarkdown(value || excerpt || "_Nothing to preview. Press ⌘↩ to open it._");
      setLoading(false);
    };
    const image = (path?: string) => (path ? imageMarkdown(path, 0) : "");
    const failed = () => show("");
    if (hit.kind === "pdf") {
      digup.render(hit.path, "pdf", page, 1800).then((p) => show(image(p)), failed);
    } else if (hit.kind === "image" || hit.kind === "screenshot") {
      digup.render(hit.path, "image", undefined, 2000).then((p) => show(image(p)), failed);
    } else if (hit.kind === "video") {
      digup
        .render(hit.path, "video", hit.loc ?? 0, 1800)
        .then((p) => show([image(p), excerpt].filter(Boolean).join("\n\n")), failed);
    } else if ((hit.kind === "code" || plainText.has(extname(hit.path).toLowerCase())) && hit.size < wholeFileLimit) {
      readFile(hit.path, "utf8").then((text) => show(passageMarkdown(hit, text, shownChars)), failed);
    } else {
      digup.text(hit.segment_id).then((text) => show(passageMarkdown(hit, text, shownChars)), failed);
    }
    return () => {
      live = false;
    };
  }, [hit, page]);

  const turn = (by: number) => {
    if (page == null) return;
    const next = Math.min(Math.max(page + by, 1), pages ?? page + by);
    if (next !== page) setPage(next);
  };

  return (
    <Detail
      isLoading={loading}
      navigationTitle={page && pages ? `${name} — page ${page} of ${pages}` : name}
      markdown={markdown ?? ""}
      metadata={<HitMetadata hit={hit} page={page} />}
      actions={
        <ActionPanel title={name}>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Path" content={hit.path} />
            <Action.Open
              title="Open"
              target={hit.path}
              icon={Icon.ArrowNe}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action
              title="Back to Results"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              onAction={pop}
            />
          </ActionPanel.Section>
          {page != null ? (
            <ActionPanel.Section title="Pages">
              <Action
                title="Next Page"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                onAction={() => turn(1)}
              />
              <Action
                title="Previous Page"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                onAction={() => turn(-1)}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.ShowInFinder path={hit.path} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />
            <Action.CopyToClipboard
              title="Copy File"
              content={{ file: hit.path }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
