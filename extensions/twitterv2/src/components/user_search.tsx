import { Detail } from "@raycast/api";
import { ReactElement } from "react";

export function UserSearchV2List(): ReactElement {
  const parts: string[] = [
    "# Unsupported",
    "Sorry, the V2 API of Twitter does not support this feature right now",
    "You can only use this command when you using the API key for an V1",
  ];
  return <Detail markdown={parts.join("  \n")} />;
}
