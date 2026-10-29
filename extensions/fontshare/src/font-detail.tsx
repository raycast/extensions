import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Font, FontPair, FontStyle } from "./api";
import { FontActions } from "./font-actions";
import PairDetail from "./pair-detail";
import { Catalog } from "./use-catalog";

// Font stories are HTML fragments (div, br, a, h1, strong). Raycast renders Markdown, so convert the few tags used.
function storyToMarkdown(story: string): string {
  return story
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|h\d)>/gi, "\n\n")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<\/?strong>/gi, "**")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function styleRow(style: FontStyle): string {
  const traits = [style.isItalic && "Italic", style.isVariable && "Variable", style.isDefault && "Default"].filter(
    Boolean,
  );
  return `| ${style.name} | ${style.weight ?? "—"} | ${traits.join(", ") || "—"} |`;
}

function buildMarkdown(font: Font): string {
  const sections = [`# ${font.name}`];

  if (font.story) {
    sections.push(storyToMarkdown(font.story));
  }

  if (font.styles.length > 0) {
    sections.push(
      ["## Styles", "", "| Style | Weight | Traits |", "| --- | --- | --- |", ...font.styles.map(styleRow)].join("\n"),
    );
  }

  if (font.languages) {
    sections.push(`## Supported Languages\n\n${font.languages}`);
  }

  return sections.join("\n\n");
}

function pairsFor(font: Font, pairs: FontPair[]): FontPair[] {
  return pairs.filter((pair) => pair.headline.familyId === font.id || pair.body.familyId === font.id);
}

// The other font of each pairing, e.g. "General Sans" for Trench Slab + General Sans.
function partnerName(font: Font, pair: FontPair): string {
  return pair.headline.familyId === font.id ? pair.body.name : pair.headline.name;
}

export default function FontDetail({ font, catalog }: { font: Font; catalog: Catalog }) {
  const pairs = pairsFor(font, catalog.pairs);

  return (
    <Detail
      navigationTitle={font.name}
      markdown={buildMarkdown(font)}
      metadata={
        <Detail.Metadata>
          {font.categories.length > 0 && (
            <Detail.Metadata.TagList title="Category">
              {font.categories.map((category) => (
                <Detail.Metadata.TagList.Item key={category} text={category} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {font.designers.length > 0 && (
            <Detail.Metadata.Label
              title={font.designers.length === 1 ? "Designer" : "Designers"}
              text={font.designers.join(", ")}
            />
          )}
          {font.publisher && <Detail.Metadata.Label title="Publisher" text={font.publisher} />}
          <Detail.Metadata.Label title="Styles" text={String(font.styles.length)} />
          {font.axes.map((axis) => (
            <Detail.Metadata.Label
              key={axis.tag}
              title={`Variable Axis (${axis.tag})`}
              text={`${axis.min}–${axis.max}, default ${axis.default}`}
            />
          ))}
          {font.license && <Detail.Metadata.Label title="License" text={font.license} />}
          {font.version && <Detail.Metadata.Label title="Version" text={font.version} />}
          {font.addedAt && <Detail.Metadata.Label title="Added" text={new Date(font.addedAt).toLocaleDateString()} />}
          {font.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {font.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {font.features.length > 0 && (
            <Detail.Metadata.TagList title="OpenType Features">
              {font.features.map((feature) => (
                <Detail.Metadata.TagList.Item key={feature} text={feature} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {pairs.length > 0 && (
            <Detail.Metadata.TagList title="Pairs Well With">
              {[...new Set(pairs.map((pair) => partnerName(font, pair)))]
                .filter((name) => name !== font.name)
                .map((name) => (
                  <Detail.Metadata.TagList.Item key={name} text={name} />
                ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Fontshare" target={font.url} text={font.slug} />
        </Detail.Metadata>
      }
      actions={
        <FontActions
          font={font}
          extra={
            pairs.length > 0 && (
              <ActionPanel.Submenu title="Show Pairing" icon={Icon.TwoPeople}>
                {pairs.map((pair) => (
                  <Action.Push key={pair.id} title={pair.title} target={<PairDetail pair={pair} catalog={catalog} />} />
                ))}
              </ActionPanel.Submenu>
            )
          }
        />
      }
    />
  );
}
