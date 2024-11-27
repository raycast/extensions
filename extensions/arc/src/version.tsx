import { Detail, environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { join } from "path";
import { lt } from "semver";
import { getVersion } from "./arc";

const MINIMUM_ARC_VERSION = "0.85.0";

export function VersionCheck(props: { children: JSX.Element }) {
  const { data, isLoading } = useCachedPromise(getVersion);

  if (isLoading && !data) {
    // Initial loading
    return <Detail isLoading />;
  } else if (isLoading && data && lt(data, MINIMUM_ARC_VERSION)) {
    // Wrong cached version, keep loading
    return <Detail isLoading />;
  } else if (!isLoading && !data) {
    // Failed loading version
    const markdown = `## Something went wrong\n\nWe are unable to fetch the version of Arc. Please make sure Arc is correctly installed and try again.`;
    return <Detail markdown={markdown} />;
  } else if (!isLoading && data && lt(data, MINIMUM_ARC_VERSION)) {
    // Finished loading, wrong version
    const image = join(environment.assetsPath, "check-for-updates.png");
    const markdown = `## Version conflict\n\nThe extension requires Arc v${MINIMUM_ARC_VERSION}. Please update the app via Arc -> Check for Updates.\n\n![Check for Updates](${image})`;
    return <Detail markdown={markdown} />;
  } else {
    // Finished loading, correct version
    return props.children;
  }
}
