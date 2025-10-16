import { Detail } from "@raycast/api";
import { ErrorResponse } from "../utils/types";

export default function ErrorComponent({ errorResponse }: { errorResponse: ErrorResponse }) {
  const markdown = errorResponse.error
    ?.replaceAll(
      "Key:",
      `
---
Key:`,
    )
    .replaceAll(
      "Error:",
      `

Error:`,
    );
  return (
    <Detail
      navigationTitle="Errors"
      markdown={`# ${errorResponse.code}

${markdown}`}
    />
  );
}
