import { LaunchProps, useNavigation } from "@raycast/api";
import { getSignedInAccountHandle, resolveHandle } from "./libs/atp";
import { useEffect, useState } from "react";

import AuthorFeed from "./components/feed/AuthorFeed";
import Error from "./components/error/Error";
import Onboard from "./components/onboarding/Onboard";
import { ViewRecentPostsNavigationTitle } from "./utils/constants";
import useStartATSession from "./hooks/useStartATSession";

interface RecentPostsProps {
  handle: string;
}

export default function RecentPosts(props: LaunchProps<{ arguments: RecentPostsProps }> | null) {
  const accountHandle = props && props.arguments && props.arguments.handle ? props.arguments.handle : null;
  const [handle, setHandle] = useState<string | null>(accountHandle);
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  const [isValidHandle, setIsValidHandle] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);

  useEffect(() => {
    const checkIfHandleIsValid = async (handle: string) => {
      const isValid = await resolveHandle(handle);
      if (isValid) {
        setIsValidHandle(true);
      } else {
        setIsValidHandle(false);
        setHandleError(`${"Invalid handle"}: ${handle}`);
      }
    };

    const fetchSignedInAccountHandle = async () => {
      const handle = await getSignedInAccountHandle();

      if (handle) {
        setHandle(handle);
        setIsValidHandle(true);
      }
    };

    if (sessionStarted && !handle) {
      fetchSignedInAccountHandle();
    }

    if (sessionStarted && handle) {
      let newHandle = handle.trim();
      if (handle.startsWith("@")) {
        newHandle = handle.slice(1);
        setHandle(newHandle.trim());
      }

      checkIfHandleIsValid(newHandle);
    }
  }, [sessionStarted]);

  if (!handle) {
    return null;
  }

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={ViewRecentPostsNavigationTitle} />
  ) : isValidHandle ? (
    <AuthorFeed showNavDropdown={true} authorHandle={handle} />
  ) : handleError && handleError.length > 0 ? (
    <Error errorMessage={handleError} navigationTitle={ViewRecentPostsNavigationTitle} showErrorBody={false} />
  ) : (
    <></>
  );
}
