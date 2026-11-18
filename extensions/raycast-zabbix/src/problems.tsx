import * as React from "react";
import type * as Types from "@ui/types";
import { ProblemsView } from "@ui/ProblemsView/main";
import { LaunchProps } from "@raycast/api";

process.env.NODE_EXTRA_CA_CERTS = process.env.NODE_EXTRA_CA_CERTS || "";

export default function Command(
  props: LaunchProps<{ launchContext: Types.LaunchContextProblems }>,
): React.JSX.Element {
  /* launchContext */
  const { serverUUID, params } = props.launchContext ?? {};
  if (serverUUID && params)
    return <ProblemsView server={serverUUID} params={params} />;

  return <ProblemsView />;
}
