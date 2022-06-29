import { Detail } from "@raycast/api";

export default function Command() {
  const d20Roll = Math.ceil(Math.random() * 20).toString();

  const markdown = `
  # Roll D20
  **Your roll:** ${d20Roll}
  `;

  return <Detail markdown={markdown} navigationTitle="Roll D20" />;
}
