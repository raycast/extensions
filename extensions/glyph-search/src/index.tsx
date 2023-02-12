import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import { arrows, circledAndSquared, keys, others, pictograms } from "./data";

function GlyphSection({ title, glyphs }) {
  return (
    <Grid.Section title={title}>
      {glyphs.map(({ glyph, glyphname, ucdescr, cp }) => (
        <Grid.Item
          key={glyphname}
          content={{ tooltip: glyphname, value: { source: `svgs/svg-${glyphname}.svg`, tintColor: Color.PrimaryText } }}
          keywords={[glyphname, ucdescr, ...ucdescr.split(" "), glyph, title]}
          actions={
            <ActionPanel>
              <Action.Paste content={glyph} />
              <Action.CopyToClipboard content={glyph} />
              <Action.CopyToClipboard content={glyphname} title="Copy Glyph Name" />
              <Action.CopyToClipboard content={ucdescr} title="Copy Glyph Description" />
              <Action.OpenInBrowser url={`https://codepoints.net/U+${cp}`} title="Open on Codepoints" />
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
