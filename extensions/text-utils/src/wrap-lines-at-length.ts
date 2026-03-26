import { LaunchProps } from "@raycast/api";
import { transformSelection } from "./utils";

function wrapText(text: string, len: number): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.length <= len) return line;
      const words = line.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        if (current && current.length + 1 + word.length > len) {
          lines.push(current);
          current = word;
        } else {
          current = current ? current + " " + word : word;
        }
      }
      if (current) lines.push(current);
      return lines.join("\n");
    })
    .join("\n");
}

export default async function Command(props: LaunchProps<{ arguments: { length: string } }>) {
  const len = parseInt(props.arguments.length, 10) || 80;
  await transformSelection((t) => wrapText(t, len), `Wrapped at ${len} chars`);
}
