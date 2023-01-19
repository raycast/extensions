import { LaunchProps } from "@raycast/api";
import { useEffect } from "react";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { Sourcegraph, sourcegraphDotCom } from "../sourcegraph";

/**
 * DotComCommand wraps the given command with the configuration for Sourcegraph.com.
 */
export default function DotComCommand({
  Command,
  props,
}: {
  Command: React.FunctionComponent<{ src: Sourcegraph; props?: LaunchProps }>;
  props?: LaunchProps;
}) {
  const src = sourcegraphDotCom();

  useEffect(checkAuthEffect(src));

  return <Command src={src} props={props} />;
}
