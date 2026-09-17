import { List } from "@raycast/api";
import { useUrl } from "../helpers/useUrl";
import { WithProjects } from "../helpers/ProjectsContext";
import { ResourceActions } from "../helpers/ResourceActions";
import { ProjectResourceList } from "../helpers/ProjectResourceList";

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
  const appUrl = useUrl(`feature_flags/${featureFlag.id}`);

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
