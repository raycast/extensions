import { Detail, environment, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { join } from "path";
import { lt } from "semver";
import { useEffect, useRef } from "react";
import { getVersion } from "../dia";

// Version that introduced AppleScript API
const MINIMUM_DIA_VERSION = "1.7.0";

function VersionCheck(props: { children: React.ReactNode }) {
  const { data, isLoading } = useCachedPromise(getVersion);
  const hasShownWarning = useRef(false);

  // Show children immediately if we have a valid cached version or while loading
  // Only block if we KNOW the version is wrong (after loading completes)
  useEffect(() => {
    if (!isLoading && data && lt(data, MINIMUM_DIA_VERSION) && !hasShownWarning.current) {
      hasShownWarning.current = true;
      showToast({
        style: Toast.Style.Failure,
        title: "Dia Update Required",
        message: `This extension requires Dia v${MINIMUM_DIA_VERSION}+. Please update via Dia → Check for Updates.`,
      });
    }
  }, [data, isLoading]);

  // If we have cached data and it's valid, show content immediately (no blocking)
  if (data && !lt(data, MINIMUM_DIA_VERSION)) {
    return props.children;
  }

  // While loading with no cache, show content optimistically (don't block)
  if (isLoading && !data) {
    return props.children;
  }

  // Only block if we KNOW the version is wrong
  if (!isLoading && data && lt(data, MINIMUM_DIA_VERSION)) {
    const image = join(environment.assetsPath, "check-for-updates.png");
    const markdown = `## Version conflict\n\nThe extension requires Dia v${MINIMUM_DIA_VERSION}. Please update the app via Dia → Check for Updates.\n\n![Check for Updates](${image})`;
    return <Detail markdown={markdown} />;
  }

  if (!isLoading && !data) {
    const markdown = `## Something went wrong\n\nWe are unable to fetch the version of Dia. Please make sure Dia is correctly installed and try again.`;
    return <Detail markdown={markdown} />;
  }

  // Default: show content (don't block on edge cases)
  return props.children;
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
