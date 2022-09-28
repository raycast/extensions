import { useEffect } from "react";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { Sourcegraph, sourcegraphDotCom } from "../sourcegraph";

/**
 * DotComCommand wraps the given command with the configuration for Sourcegraph.com.
 */
export default function DotComCommand({ Command }: { Command: React.FunctionComponent<{ src: Sourcegraph }> }) {
  const src = sourcegraphDotCom();

  useEffect(checkAuthEffect(src));

  return <Command src={src} />;
}
