import { Detail } from "@raycast/api";

export default function ShowNotesDetail({ title, content }: { title: string; content: string }) {
  const markdown = `
## ${title}

${content}
`;

  return <Detail markdown={markdown} navigationTitle="Show Notes" />;
}
