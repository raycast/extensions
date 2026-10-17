import { Detail } from "@raycast/api";
export default function ErrorComponent({ error }: { error: unknown }) {
  const markdown = `# ${(error as Error).name} \n\n  \`\`\`${error}\`\`\``;
  return <Detail navigationTitle="Errors" markdown={markdown} />;
}
