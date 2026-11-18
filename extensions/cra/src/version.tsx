import type { ReactElement } from "react";
import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { lt } from "semver";
import { getVersion } from "./cra";

const MINIMUM_ARC_VERSION = "0.0.0";

export function VersionCheck(props: { children: ReactElement }) {
  const { data, isLoading } = useCachedPromise(getVersion);

  if (isLoading && !data) {
    // Initial loading
    return <Detail isLoading />;
  } else if (isLoading && data && lt(data, MINIMUM_ARC_VERSION)) {
    // Wrong cached version, keep loading
    return <Detail isLoading />;
  } else if (!isLoading && !data) {
    // Failed loading version
    const markdown = `## Something went wrong\n\nWe are unable to fetch the version of Cra. Please make sure Cra is correctly installed and try again.`;
    return <Detail markdown={markdown} />;
  } else if (!isLoading && data && lt(data, MINIMUM_ARC_VERSION)) {
    // Finished loading, wrong version
    const markdown = `## Version conflict\n\nThe extension requires Cra v${MINIMUM_ARC_VERSION}. Please update the app via Cra.`;
    return <Detail markdown={markdown} />;
  } else {
    // Finished loading, correct version
    return props.children;
  }
}
