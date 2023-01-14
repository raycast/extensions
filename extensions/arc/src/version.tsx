import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { lt } from "semver";
import { getVersion } from "./arc";

const REQUIRED_ARC_VERSION = "0.89.0";

export function VersionCheck(props: { children: JSX.Element }) {
  const { data, isLoading } = useCachedPromise(getVersion);

  if (isLoading) {
    return <Detail isLoading />;
  } else if (!data) {
    return (
      <Detail
        markdown={`**Something went wrong.**
        We are unable to fetch Arc version. Please make sure Arc is correctly installed in the system.`}
      />
    );
  } else if (lt(data, REQUIRED_ARC_VERSION)) {
    return (
      <Detail
        markdown={`**Version Conflict**
        The extension requires Arc v${REQUIRED_ARC_VERSION}.
        Please update the app via Arc -> Check for Updates.`}
      />
    );
  } else {
    return props.children;
  }
}
