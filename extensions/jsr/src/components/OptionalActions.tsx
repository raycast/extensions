import { Action } from "@raycast/api";

import type { Package } from "@/types";

import { jsrUrls } from "@/lib/jsrUrls";

type OptionalActionsProps = {
  selectedPackageData?: Package;
  enabled: boolean;
};

const OptionalActions = ({ selectedPackageData, enabled }: OptionalActionsProps) => {
  if (
    !enabled ||
    !selectedPackageData ||
    !(selectedPackageData.githubRepository?.owner && selectedPackageData.githubRepository?.name)
  ) {
    return null;
  }
  return (
    <>
      <Action.OpenInBrowser
        title="Open GitHub Repository"
        icon={{ source: "github.svg" }}
        url={jsrUrls.site.github(selectedPackageData.githubRepository.owner, selectedPackageData.githubRepository.name)}
        shortcut={{ key: "g", modifiers: ["cmd", "shift"] }}
      />
    </>
  );
};

export default OptionalActions;
