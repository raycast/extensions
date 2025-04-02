import { Detail } from "@raycast/api";
import { jwtLogo } from "../constants";
import { getValue } from "../utils/get-value";

export function ErrorDetail(props: { error: unknown; value: string }) {
  return (
    <Detail
      markdown={`<img alt="JWT Logo" width="70" src="${jwtLogo}" />\n\n# Please Copy a valid JWT to your clipboard\n\nERROR:\n> ${
        props.error instanceof Error ? props.error.message : String(props.error)
      }\n\n\`\`\`\n${getValue(props.value)}\n\`\`\``}
    />
  );
}
