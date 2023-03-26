import { ActionPanel, Action, List } from "@raycast/api";

interface Character {
  label: string;
  value: string;
  description?: string;
  keywords?: string[];
}

// Useful reference: https://www.typewolf.com/cheatsheet
const characters: Character[] = [
  {
    label: "Em Dash",
    value: "—",
  },
  {
    label: "En Dash",
    value: "–",
  },
  {
    label: "Figure Dash",
    value: "‒",
    keywords: ["Number", "Dash"],
  },
  { label: "Minus", value: "−", keywords: ["Minus"] },
  { label: "Opening Double Quote", value: "“", keywords: ["Left"] },
  { label: "Closing Double Quote", value: "”", keywords: ["Right"] },
  {
    label: "Opening Single Quote",
    value: "‘",
    keywords: ["Left"],
  },
  {
    label: "Closing Single Quote & Apostrophe",
    value: "’",
    keywords: ["Apostrophe", "Right"],
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
    <List>
      {characters.map((char) => (
        <List.Item
          key={char.label}
          title={char.value}
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
