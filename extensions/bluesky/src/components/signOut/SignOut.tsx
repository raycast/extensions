import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";
import {
  SignOutActionMessage,
  SignedOut,
  SignedOutMarkdown,
  SignedOutToast,
  SigningOutMarkdown,
  SigningOutToast,
} from "../../utils/constants";
import { buildTitle, showLoadingToast, showSuccessToast } from "../../utils/common";
import { useEffect, useState } from "react";

import { clearCache } from "../../utils/cacheStore";
import { clearLocalStore } from "../../utils/localStore";

interface SignOutProps {
  previousViewTitle?: string;
}

const SignOut = ({ previousViewTitle = "" }: SignOutProps) => {
  const [isSignedOut, setIsSignedOut] = useState(false);

  useEffect(() => {
    showLoadingToast(SigningOutToast);

    const clearAndSignOut = async () => {
      await clearLocalStore();
      await clearCache();

      showSuccessToast(SignedOutToast);
      setIsSignedOut(true);
    };

    clearAndSignOut();
  }, []);

  return (
    <Detail
      navigationTitle={buildTitle(previousViewTitle, SignedOut)}
      actions={
        <ActionPanel>
          <Action title={SignOutActionMessage} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      markdown={isSignedOut ? SignedOutMarkdown : SigningOutMarkdown}
    />
  );
};

export default SignOut;
