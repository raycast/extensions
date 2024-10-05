import { Detail } from "@raycast/api";

export default function ErrorDetail({ error }: { error: Error }) {
  if (error.message.includes("Not Found")) {
    return <Detail markdown={"# The Vehicle was not found"} />;
  } else if (error.message.includes("Unauthorized")) {
    return <Detail markdown={"# Unauthorized access - please check your API Key"} />;
  }

  const markdown = `  
  # An error occurred
  ## Error message: ${error.message}
  ## Error name: ${error.name}
  ## Error stack: ${error.stack}
  ## Error cause: ${error.cause}
  `;

  return <Detail markdown={markdown} />;
}
