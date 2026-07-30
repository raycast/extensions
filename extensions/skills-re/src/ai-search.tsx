import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getActiveCredential } from "./api";
import type { AuthCredential } from "./api";
import { getErrorMessage } from "./api-error";
import { ApiTokenForm } from "./auth";
import { SkillSearchList } from "./skill-search-list";

const missingApiTokenMarkdown = "# AI Search\n\nAdd a skills.re API token to use semantic AI Search from Raycast.";

export default function Command() {
  const [credential, setCredential] = useState<AuthCredential | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCredential = async () => {
      try {
        const activeCredential = await getActiveCredential();
        if (isMounted) {
          setCredential(activeCredential);
        }
      } catch (error) {
        await showToast({
          message: getErrorMessage(error),
          style: Toast.Style.Failure,
          title: "Could not load API token",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCredential();

    return () => {
      isMounted = false;
    };
  }, []);

  if (credential) {
    return <SkillSearchList searchMode="semantic" />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={missingApiTokenMarkdown}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Key} title="Configure API Token" target={<ApiTokenForm />} />
        </ActionPanel>
      }
    />
  );
}
