import { Detail, Action, ActionPanel, launchCommand, LaunchType } from "@raycast/api";
import { withAccessToken, useLocalStorage } from "@raycast/utils";
import { basecamp } from "./oauth/auth";
import ProjectsList from "./components/ProjectsList";

const NO_DEFAULT_BASECAMP_INSTRUCTIONS = `
# No Default Basecamp Set

Please set a default basecamp by going to the 'View All Basecamps' command or hit \`enter\` to launch the command, locate the basecamp you want to use, and running the 'Set Default Basecamp' in the action panel which you view with \`cmd + k\`.
`;

function ViewProjectsCommand() {
  const {
    value: defaultBasecampConfig,
    removeValue: removeDefaultBasecampConfig,
    isLoading,
  } = useLocalStorage<string>("defaultBasecampConfig", "");

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading..." />;
  }

  if (!defaultBasecampConfig) {
    return (
      <Detail
        markdown={NO_DEFAULT_BASECAMP_INSTRUCTIONS}
        actions={
          <ActionPanel>
            <Action
              title="View All Basecamps"
              onAction={() => launchCommand({ name: "view-all-basecamps", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  }

  const splitConfig = defaultBasecampConfig.split("|");

  if (splitConfig.length !== 2) {
    // Config is invalid, remove it
    removeDefaultBasecampConfig();
  }

  const accountId = splitConfig[0];
  const accountName = splitConfig[1];

  return <ProjectsList accountId={Number(accountId)} accountName={accountName} />;
}

export default withAccessToken(basecamp)(ViewProjectsCommand);
