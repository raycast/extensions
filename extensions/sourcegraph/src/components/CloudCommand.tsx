import { useEffect } from "react";

import checkAuthEffect from "../hooks/checkAuthEffect";
import { Sourcegraph, sourcegraphCloud } from "../sourcegraph";

/**
 * SelfHostedCommand wraps the given command with the configuration for Sourcegraph Cloud.
 */
export default function CloudCommand({ Command }: { Command: React.FunctionComponent<{ src: Sourcegraph }> }) {
  const src = sourcegraphCloud();

  useEffect(checkAuthEffect(src));

  return <Command src={src} />;
}
