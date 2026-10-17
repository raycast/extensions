import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getActiveCredential } from "./api";
import { ApiTokenForm } from "./auth";
import { SkillSearchList } from "./skill-search-list";

const missingApiTokenMarkdown = "# AI Search\n\nAdd a skills.re API token to use semantic AI Search from Raycast.";

export default function Command() {
  const { data: credential, isLoading } = useCachedPromise(getActiveCredential, [], {
    failureToastOptions: { title: "Could not load API token" },
  });

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
