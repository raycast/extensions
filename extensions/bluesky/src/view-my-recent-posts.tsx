import { useEffect, useState } from "react";

import AuthorFeed from "./components/feed/AuthorFeed";
import Error from "./components/error/Error";
import Onboard from "./components/onboarding/Onboard";
import { ViewRecentPostsNavigationTitle } from "./utils/constants";
import { buildTitle } from "./utils/common";
import { getSignedInUserHandle } from "./libs/atp";
import { useNavigation } from "@raycast/api";
import useStartATSession from "./hooks/useStartATSession";

export default function ViewRecentPosts() {
  const [handle, setHandle] = useState<string | null>("");
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  useEffect(() => {
    const fetchHandle = async () => {
      const handle = await getSignedInUserHandle();

      if (handle) {
        setHandle(handle);
      }
    };

    if (sessionStarted) {
      fetchHandle();
    }
  }, [sessionStarted]);

  if (!handle) {
    return null;
  }

  return sessionStartFailed ? (
    <Error
      errorMessage={errorMessage}
      navigationTitle={ ViewRecentPostsNavigationTitle}
    />
  ) : (
    <AuthorFeed previousViewTitle="" authorHandle={handle} />
  );
}
