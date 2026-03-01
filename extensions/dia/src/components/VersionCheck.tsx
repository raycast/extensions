import { Detail, environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { join } from "path";
import { lt } from "semver";
import { getVersion } from "../dia";

// Version that introduced AppleScript API
const MINIMUM_DIA_VERSION = "1.7.0";

function VersionCheck(props: { children: React.ReactNode }) {
  const { data, isLoading } = useCachedPromise(getVersion);

  console.log("data", data);

  if (isLoading && !data) {
    // Initial loading
    return <Detail isLoading />;
  } else if (isLoading && data && lt(data, MINIMUM_DIA_VERSION)) {
    // Wrong cached version, keep loading
    return <Detail isLoading />;
  } else if (!isLoading && !data) {
    // Failed loading version
    const markdown = `## Something went wrong\n\nWe are unable to fetch the version of Dia. Please make sure Dia is correctly installed and try again.`;
    return <Detail markdown={markdown} />;
  } else if (!isLoading && data && lt(data, MINIMUM_DIA_VERSION)) {
    // Finished loading, wrong version
    const image = join(environment.assetsPath, "check-for-updates.png");
    const markdown = `## Version conflict\n\nThe extension requires Dia v${MINIMUM_DIA_VERSION}. Please update the app via Dia -> Check for Updates.\n\n![Check for Updates](${image})`;
    return <Detail markdown={markdown} />;
  } else {
    // Finished loading, correct version
    return props.children;
  }
}

export default function withVersionCheck(Component: React.ComponentType) {
  return function WrappedComponent(props: React.ComponentProps<typeof Component>) {
    return (
      <VersionCheck>
        <Component {...props} />
      </VersionCheck>
    );
  };
}
