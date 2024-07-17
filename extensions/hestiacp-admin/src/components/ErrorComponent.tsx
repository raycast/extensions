import { Detail } from "@raycast/api";

export default function ErrorComponent({ error }: { error: Error }) {
  const markdown = `# ERROR 
    
${error.cause || "Something went wrong"}

${error.message}`;

  return <Detail navigationTitle="Error" markdown={markdown} />;
}
