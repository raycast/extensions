import { List } from "@raycast/api";
import { buildAppUrl } from "../helpers/appUrl";
import { ProjectResourceList } from "../helpers/ProjectResourceList";
import { ResourceActions } from "../helpers/ResourceActions";
import { WithProjects, ProjectsContext } from "../helpers/ProjectsContext";
import { useContext } from "react";

type FeatureFlag = {
  id: number;
  key: string;
};

function FeatureFlags() {
  return (
    <ProjectResourceList<FeatureFlag> endpoint="feature_flags" searchBarPlaceholder="Search feature flags...">
      {(featureFlags) =>
        featureFlags.map((featureFlag) => <ResultsListSection key={featureFlag.id} featureFlag={featureFlag} />)
      }
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ featureFlag }: { featureFlag: FeatureFlag }) => {
  const { selectedAccount } = useContext(ProjectsContext);
  const appUrl = buildAppUrl(`feature_flags/${featureFlag.id}`, selectedAccount);

  return (
    <List.Item
      key={featureFlag.id}
      title={featureFlag.key}
      actions={<ResourceActions title={featureFlag.key} url={appUrl} />}
    />
  );
};

export default function Command() {
  return (
    <WithProjects>
      <FeatureFlags />
    </WithProjects>
  );
}
