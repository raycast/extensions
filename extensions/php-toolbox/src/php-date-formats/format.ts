import data from "./data";

const map = data.reduce((map, section) => {
  section.items.forEach((item) => map.set(item.character, item.example || "�"));
  return map;
}, new Map<string, string>());

export default function format(input: string): string {
  return input
    .split("")
    .map((character) => (map.has(character) ? map.get(character) : character))
    .join("");
}
