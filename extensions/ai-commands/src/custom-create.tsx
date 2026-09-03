import { getPreferenceValues } from "@raycast/api";
import * as React from "react";
import { CustomCommandForm } from "./lib/ui/CustomCommandForm";

const p = getPreferenceValues<Preferences>();
if (p.certificateValidation === false) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): React.JSX.Element {
  return <CustomCommandForm />;
}
