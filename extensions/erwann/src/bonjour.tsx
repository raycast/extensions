import { Detail } from "@raycast/api";

export default function Command() {
  const markdown = `
# Bonjour! 👋

Welcome to Erwann's greeting!
  `;

  return <Detail markdown={markdown} />;
}
