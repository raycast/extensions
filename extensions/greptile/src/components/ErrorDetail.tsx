import { Detail } from "@raycast/api";

import { getErrorMessage } from "../helpers/errors";

export function ErrorDetail({ error }: { error: unknown }) {
  return (
    <Detail
      markdown={`# Greptile Error\n\n\`\`\`\n${getErrorMessage(error)}\n\`\`\``}
    />
  );
}
