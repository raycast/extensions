import { Color, Detail, Icon } from "@raycast/api";
import { genderLabel, safeParseArray, type CelebrityBaby, type Name } from "./lib/types";

const genderTagColor: Record<string, Color> = {
  male: Color.Blue,
  female: Color.Magenta,
  neutral: Color.Purple,
};

/** Build the Markdown body for a name's detail view (shared by NameDetail and session voting). */
export function buildNameMarkdown(n: Name): string {
  const meanings = safeParseArray<string>(n.meanings);
  const alternativeSpellings = safeParseArray<string>(n.alternativeSpellings);
  const nicknames = safeParseArray<string>(n.nicknames);
  const relatedNames = safeParseArray<string>(n.relatedNames);
  const celebrityBabies = safeParseArray<CelebrityBaby>(n.celebrityBabies);
  const songs = safeParseArray<string>(n.songs);

  const parts: string[] = [`# ${n.name}`];

  if (n.longDescription) parts.push(n.longDescription);

  if (meanings.length > 0) {
    parts.push(`## Meaning\n${meanings.map((m) => `- ${m}`).join("\n")}`);
  }

  if (alternativeSpellings.length > 0) {
    parts.push(`## Alternative Spellings\n${alternativeSpellings.join(", ")}`);
  }

  if (nicknames.length > 0) {
    parts.push(`## Nicknames\n${nicknames.join(", ")}`);
  }

  if (relatedNames.length > 0) {
    parts.push(`## Related Names\n${relatedNames.join(", ")}`);
  }

  if (celebrityBabies.length > 0) {
    parts.push(`## Celebrity Babies\n${celebrityBabies.map((c) => `- **${c.child}** (${c.parent})`).join("\n")}`);
  }

  if (songs.length > 0) {
    const songLines = songs.map((song) => {
      const q = encodeURIComponent(song);
      const spotify = `https://open.spotify.com/search/${q}`;
      const apple = `https://music.apple.com/us/search?term=${q}`;
      return `- ${song} — [Spotify](${spotify}) · [Apple Music](${apple})`;
    });
    parts.push(`## Songs Featuring This Name\n${songLines.join("\n")}`);
  }

  return parts.join("\n\n");
}

/** The metadata sidebar for a name's detail view (shared by NameDetail and session voting). */
export function NameMetadata({ nameData: n, baseUrl }: { nameData: Name; baseUrl: string }) {
  const tags = safeParseArray<string>(n.tags);
  const slug = encodeURIComponent(n.name.toLowerCase());

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Gender">
        <Detail.Metadata.TagList.Item
          text={genderLabel[n.gender]}
          color={genderTagColor[n.gender] ?? Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Label title="Origin" text={n.origin} icon={Icon.Globe} />
      {n.currentRank != null && <Detail.Metadata.Label title="Current Rank" text={`#${n.currentRank}`} />}
      {n.ssaRank != null && (
        <Detail.Metadata.Label
          title="US Popularity"
          text={n.ssaYear ? `#${n.ssaRank} (${n.ssaYear})` : `#${n.ssaRank}`}
        />
      )}
      {tags.length > 0 && (
        <Detail.Metadata.TagList title="Tags">
          {tags.map((tag) => (
            <Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </Detail.Metadata.TagList>
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="Web Page" target={`${baseUrl}/name/${slug}`} text="View on Bump Name Match" />
      {n.hasWikipediaPage ? (
        <Detail.Metadata.Link
          title="Wikipedia"
          target={`https://en.wikipedia.org/wiki/${encodeURIComponent(n.name)}_(name)`}
          text={`Read about ${n.name}`}
        />
      ) : null}
    </Detail.Metadata>
  );
}
