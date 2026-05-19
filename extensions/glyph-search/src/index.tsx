import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import { arrows, circledAndSquared, Glyph, keys, others, pictograms } from "./data";

function interSvgSource(name: string) {
  return `https://raw.githubusercontent.com/gbougakov/inter-svgs/9fba6c5cac248ae9831b4e8cf45f3b6a334bc176/svg-${name}.svg`;
}

function isPrivateUseCodepoint(codepoint: string) {
  const value = Number.parseInt(codepoint, 16);
  return value >= 0xe000 && value <= 0xf8ff;
}

function glyphContent({ codepoint, glyph, name }: Glyph, renderNativeUnicodeGlyphs: boolean) {
  if (renderNativeUnicodeGlyphs && !isPrivateUseCodepoint(codepoint)) {
    return glyph;
  }

  return {
    source: interSvgSource(name),
    tintColor: Color.PrimaryText,
  };
}

function GlyphSection({
  title,
  glyphs,
  renderNativeUnicodeGlyphs = false,
}: {
  title: string;
  glyphs: Glyph[];
  renderNativeUnicodeGlyphs?: boolean;
}) {
  return (
    <Grid.Section title={title}>
      {glyphs.map((item) => (
        <Grid.Item
          key={item.name}
          content={{
            tooltip: item.name,
            value: glyphContent(item, renderNativeUnicodeGlyphs),
          }}
          keywords={[item.name, item.unicodeDescription, ...item.unicodeDescription.split(" "), item.glyph, title]}
          actions={
            <ActionPanel>
              <Action.Paste content={item.glyph} />
              <Action.CopyToClipboard content={item.glyph} />
              <Action.CopyToClipboard content={item.name} title="Copy Glyph Name" />
              <Action.CopyToClipboard content={item.unicodeDescription} title="Copy Glyph Description" />
              <Action.OpenInBrowser url={`https://codepoints.net/U+${item.codepoint}`} title="Open on Codepoints" />
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
      <GlyphSection title="Circled and Squared" glyphs={circledAndSquared} renderNativeUnicodeGlyphs />
      <GlyphSection title="Others" glyphs={others} />
    </Grid>
  );
}
