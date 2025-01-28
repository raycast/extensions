import { List } from "@raycast/api";

const references = [
  // title, tag1, tag2, ...
  ["webp l pos:c", "webp,jpg,png", "xl,l,m,s,o,100x100", "pos:c,.."],
  ["hor gap:black,3 bg:transparent", "hor,ver", "gap:..", "bg:.."],
  ["pdf"],
  ["jpg | ver | pdf"],
];

const examples = [
  // title, description
  ["", "convert to jpg with large size"],
  ["webp 100", "convert to webp with 100 width"],
  ["webp x100", "convert to webp with 100 height"],
  ["webp 100x100", "convert to webp with 100x100 size"],
  ["webp o", "convert to webp with original size"],
  ["webp 100x100 pos:ne", "crop image with northeast position"],
  ["hor", "concat image horizontally with black 3px gap and transparent background"],
  ["hor gap:white,5 bg:white", "concat image horizontally with white 5px gap and white background"],
  ["pdf", "convert to pdf"],
  ["jpg | ver | pdf", "convert to jpg, concat vertically, output pdf"],
];

export default function Command() {
  return (
    <List>
      <List.Section title="References">
        {references.map((reference) => (
          <List.Item
            key={reference[0]}
            title={reference[0]}
            accessories={reference.slice(1).map((text) => ({ tag: text }))}
          />
        ))}
      </List.Section>
      <List.Section title="Examples">
        {examples.map((example) => (
          <List.Item key={example[0]} title={example[0]} accessories={[{ text: example[1] }]} />
        ))}
      </List.Section>
    </List>
  );
}
