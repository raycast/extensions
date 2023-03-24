import { ActionPanel, Action, List } from "@raycast/api";

interface Character {
  label: string;
  value: string;
  description?: string;
  keywords?: string[];
}

const singleQuoteDescription = `> In American English, single quotes are used for quotes inside of quotes. In British English, this is usually reversed. Newspaper headlines may also use single quotes in place of double quotes to save space.

— [typewolf.com/cheatsheet](https://www.typewolf.com/cheatsheet)`;

// Useful reference: https://www.typewolf.com/cheatsheet
const characters: Character[] = [
  {
    label: "Em Dash",
    value: "—",
    description: `> Em dashes can be used where parentheses might otherwise be used. They can also be used in place of a colon or when a comma is too weak but a period is too strong. An em dash is also used to show attribution of a quote, placed in front of the person’s name.

— [typewolf.com/cheatsheet](https://www.typewolf.com/cheatsheet)`,
  },
  {
    label: "En Dash",
    value: "–",
    description: `> An unspaced en dash can be used in place of the word “through” when indicating a range of values, such as numbers, times and dates. For example, July 5th–9th. It’s also used to show relationships between two things, such as a Boston–London flight.

— [typewolf.com/cheatsheet](https://www.typewolf.com/cheatsheet)`,
  },
  {
    label: "Figure Dash",
    value: "‒",
    description: `> The figure dash is the same width as a digit and is used for alignment purposes when setting numbers. It shouldn’t be used to indicate a range of numbers—that is the job of the en dash—instead, it should be used for setting things such as phone numbers (555‒867‒5309). Not all fonts contain figure dashes.

— [typewolf.com/cheatsheet](https://www.typewolf.com/cheatsheet)`,
    keywords: ["Number", "Dash"],
  },
  { label: "Minus", value: "−", keywords: ["Minus"] },
  { label: "Opening Double Quote", value: "“", keywords: ["Left"] },
  { label: "Closing Double Quote", value: "”", keywords: ["Right"] },
  {
    label: "Opening Single Quote",
    value: "‘",
    keywords: ["Left"],
    description: singleQuoteDescription,
  },
  {
    label: "Closing Single Quote & Apostrophe",
    value: "’",
    keywords: ["Apostrophe", "Right"],
    description: singleQuoteDescription,
  },
  { label: "Prime (Feet)", value: "′", keywords: ["Feet"] },
  { label: "Double Prime (Inches)", value: "″", keywords: ["Inches"] },
  { label: "Ellipsis", value: "…" },
  { label: "Left arrow", value: "←" },
  { label: "Right arrow", value: "→" },
  { label: "Up arrow", value: "↑" },
  { label: "Down arrow", value: "↓" },
  { label: "Multiplication", value: "×", keywords: ["Multiply", "Times"] },
  { label: "Division", value: "÷", keywords: ["Divide"] },
  { label: "Plus/Minus", value: "±" },
  { label: "Less Than or Equal To", value: "≤" },
  { label: "Greater Than or Equal To", value: "≥" },
  { label: "Not Equal To", value: "≠" },
  { label: "Almost equal", value: "≈" },
  { label: "Cents", value: "¢" },
  { label: "Degree", value: "°" },
  { label: "Registered", value: "®" },
  { label: "Copyright", value: "©" },
  { label: "Trademark", value: "™" },
];

export default function Command() {
  return (
    <List isShowingDetail={false}>
      {characters.map((char) => (
        <List.Item
          key={char.label}
          title={char.value}
          // detail={<List.Item.Detail markdown={`# ${char.label}\n${char.description ?? ""}`} />}
          subtitle={char.label}
          keywords={[...char.label.split(/\s/), ...(char.keywords ?? [])]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={char.value} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
