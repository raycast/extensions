import { Detail } from "@raycast/api";

export function PrinterStatusError({ error }: { error: Error }) {
  let errorMarkdown: string;

  switch (error.message) {
    case "CONFLICT":
      errorMarkdown = `Status code: 409 - Printer is not operational. This error is returned when OctoPrint is running but not connected to a printer`;
      break;
    case "FORBIDDEN":
      errorMarkdown = `Status code: 403 - Invalid API key`;
      break;
    default:
      errorMarkdown = `OctoPrint Status unknown error`;
      break;
  }

  const markdown = `
  # OctoPrint error
  ## ${errorMarkdown}
  `;

  return <Detail markdown={markdown} />;
}
