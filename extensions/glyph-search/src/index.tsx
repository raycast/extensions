import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import { arrows, circledAndSquared, Glyph, keys, others, pictograms } from "./data";

function glyphTextSource(glyph: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="54" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="64">${glyph}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function GlyphSection({
  title,
  glyphs,
  renderNativeGlyphs = false,
}: {
  title: string;
  glyphs: Glyph[];
  renderNativeGlyphs?: boolean;
}) {
  return (
    <Grid.Section title={title}>
      {glyphs.map(({ glyph, name, unicodeDescription, codepoint }) => (
        <Grid.Item
          key={name}
          content={{
            tooltip: name,
            value: {
              source: renderNativeGlyphs
                ? glyphTextSource(glyph)
                : `https://raw.githubusercontent.com/gbougakov/inter-svgs/9fba6c5cac248ae9831b4e8cf45f3b6a334bc176/svg-${name}.svg`,
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
      <GlyphSection title="Circled and Squared" glyphs={circledAndSquared} renderNativeGlyphs />
      <GlyphSection title="Others" glyphs={others} />
    </Grid>
  );
}
