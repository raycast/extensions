import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import { arrows, circledAndSquared, Glyph, keys, others, pictograms } from "./data";

function GlyphSection({ title, glyphs }: { title: string; glyphs: Glyph[] }) {
  return (
    <Grid.Section title={title}>
      {glyphs.map(({ glyph, name, unicodeDescription, codepoint }) => (
        <Grid.Item
          key={name}
          content={{
            tooltip: name,
            value: {
              source: `https://raw.githubusercontent.com/gbougakov/inter-svgs/9fba6c5cac248ae9831b4e8cf45f3b6a334bc176/svg-${name}.svg`,
              tintColor: Color.PrimaryText,
            },
          }}
          keywords={[name, unicodeDescription, ...unicodeDescription.split(" "), glyph, title]}
          actions={
            <ActionPanel>
              <Action.Paste content={glyph} />
              <Action.CopyToClipboard content={glyph} />
              <Action.CopyToClipboard content={name} title="Copy Glyph Name" />
              <Action.CopyToClipboard content={unicodeDescription} title="Copy Glyph Description" />
              <Action.OpenInBrowser url={`https://codepoints.net/U+${codepoint}`} title="Open on Codepoints" />
            </ActionPanel>
          }
        />
      ))}
    </Grid.Section>
  );
}

export default function Command() {
  return (
    <Grid inset={Grid.Inset.Large} columns={8}>
      <GlyphSection title="Arrows" glyphs={arrows} />
      <GlyphSection title="Keys" glyphs={keys} />
      <GlyphSection title="Pictograms" glyphs={pictograms} />
      <GlyphSection title="Circled and Squared" glyphs={circledAndSquared} />
      <GlyphSection title="Others" glyphs={others} />
    </Grid>
  );
}
