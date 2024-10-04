import { Detail } from "@raycast/api";

export default function ErrorDetail({ error }: { error: Error }) {
  const markdown = `  
  # An error occurred
  ## Error message: ${error.message}
  ## Error name: ${error.name}
  ## Error stack: ${error.stack}
  ## Error cause: ${error.cause}
 
  `;

  return <Detail markdown={markdown} />;
}
