import { Detail } from "@raycast/api";

export default function ErrorDetail({ error }: { error: Error }) {
  const markdown = `  
  # An error occurred
  ${error.message}
  `;

  return <Detail markdown={markdown} />;
}
