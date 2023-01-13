import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { lt } from "semver";
import { getVersion } from "./arc";

export function VersionCheck(props: { children: JSX.Element }) {
  const { data } = useCachedPromise(getVersion);

  if (!data) {
    return <Detail isLoading />;
  } else if (lt("0.85.0", data)) {
    return (
      <Detail markdown="# Version Conflict\n\nThe extension requires Arc v0.85.0. Please update the app via Arc -> Check for Updates." />
    );
  } else {
    return props.children;
  }
}
