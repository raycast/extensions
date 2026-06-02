import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import { copyBibtex } from "./copy-bibtex";
import { Publication, typeLabel } from "./dblp";

/** Pretty label for an electronic-edition link based on its host. */
function linkLabel(url: string): string {
  if (/doi\.org/i.test(url)) return "DOI";
  if (/arxiv\.org/i.test(url)) return "arXiv";
  if (/\.pdf($|\?)/i.test(url)) return "PDF";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

export function PublicationDetail({ publication }: { publication: Publication }) {
  const people = publication.authors.length > 0 ? publication.authors : publication.editors;

  const markdownParts: string[] = [`# ${publication.title}`];
  if (people.length > 0) {
    markdownParts.push(`_${people.join(", ")}_`);
  }
  if (publication.venue) {
    const venueLine = [publication.venue, publication.year].filter(Boolean).join(", ");
    markdownParts.push(venueLine);
  }
  const markdown = markdownParts.join("\n\n");

  return (
    <Detail
      navigationTitle={publication.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={typeLabel(publication.type)} />
          {publication.year && <Detail.Metadata.Label title="Year" text={publication.year} />}

          {publication.authors.length > 0 && (
            <Detail.Metadata.TagList title="Authors">
              {publication.authors.map((name) => (
                <Detail.Metadata.TagList.Item key={name} text={name} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {publication.editors.length > 0 && (
            <Detail.Metadata.TagList title="Editors">
              {publication.editors.map((name) => (
                <Detail.Metadata.TagList.Item key={name} text={name} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {publication.journal && (
            <Detail.Metadata.Label title="Journal" text={publication.journal} />
          )}
          {publication.booktitle && (
            <Detail.Metadata.Label title="Book / Proceedings" text={publication.booktitle} />
          )}
          {publication.series && <Detail.Metadata.Label title="Series" text={publication.series} />}
          {publication.volume && <Detail.Metadata.Label title="Volume" text={publication.volume} />}
          {publication.number && <Detail.Metadata.Label title="Number" text={publication.number} />}
          {publication.pages && <Detail.Metadata.Label title="Pages" text={publication.pages} />}
          {publication.publisher && (
            <Detail.Metadata.Label title="Publisher" text={publication.publisher} />
          )}
          {publication.school && <Detail.Metadata.Label title="School" text={publication.school} />}
          {publication.isbn && <Detail.Metadata.Label title="ISBN" text={publication.isbn} />}

          {publication.doi && (
            <Detail.Metadata.Link title="DOI" target={publication.doi} text={publication.doi} />
          )}

          {(publication.ees.length > 0 || publication.dblpUrl) && <Detail.Metadata.Separator />}

          {publication.ees.map((url) => (
            <Detail.Metadata.Link key={url} title={linkLabel(url)} target={url} text={url} />
          ))}
          {publication.dblpUrl && (
            <Detail.Metadata.Link
              title="DBLP"
              target={publication.dblpUrl}
              text={publication.dblpUrl}
            />
          )}

          <Detail.Metadata.Label title="BibTeX Key" text={publication.key} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {publication.ee && (
            <Action
              icon={Icon.Link}
              title="Open Publication (doi / Pdf)"
              onAction={() => open(publication.ee!)}
            />
          )}
          {publication.dblpUrl && (
            <Action
              icon={Icon.Globe}
              title="Open on Dblp"
              onAction={() => open(publication.dblpUrl!)}
            />
          )}
          <ActionPanel.Section>
            <Action
              icon={Icon.Clipboard}
              title="Copy Bibtex"
              onAction={() => copyBibtex(publication)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={publication.title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            {publication.ee && (
              <Action.CopyToClipboard
                title="Copy Publication Link"
                content={publication.ee}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
