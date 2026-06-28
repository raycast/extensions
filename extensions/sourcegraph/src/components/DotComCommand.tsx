import { Detail, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";

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
  const [src, setSrc] = useState<Sourcegraph>();
  useEffect(() => {
    async function loadSrc() {
      setSrc(await sourcegraphDotCom());
    }
    loadSrc();
  }, []);

  if (!src) {
    return <Detail isLoading={true} />;
  }
  return <CheckAuthCommand src={src} props={props} Command={Command} />;
}

// Inner wrapper for the command to deal with using checkAuthEffect while src
// requires async to initialize.
function CheckAuthCommand({
  src,
  Command,
  props,
}: {
  src: Sourcegraph;
  props?: LaunchProps;
  Command: React.FunctionComponent<{ src: Sourcegraph; props?: LaunchProps }>;
}) {
  useEffect(checkAuthEffect(src), []);
  return <Command src={src} props={props} />;
}
