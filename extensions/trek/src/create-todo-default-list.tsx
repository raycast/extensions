import { Detail, Action, ActionPanel, launchCommand, LaunchType, showHUD, PopToRootType } from "@raycast/api";
import { withAccessToken, useLocalStorage } from "@raycast/utils";
import { basecamp } from "./oauth/auth";
import CreateTodoForm from "./components/CreateTodoForm";

const SET_DEFAULT_TODO_LIST_INSTRUCTIONS = `
# No Default Todo List Set

Please set a default todo list by going to the 'View All Basecamps' command or hit \`enter\` to launch the command, locate the todo list you want to use, and running the 'Set Default Todo List' in the action panel which you view with \`cmd + k\`.
`;

function CreateTodoCommand() {
  const {
    value: defaultTodoListConfig,
    removeValue: removeDefaultTodoListConfig,
    isLoading,
  } = useLocalStorage<string>("defaultTodoListConfig", "");

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading..." />;
  }

  if (!defaultTodoListConfig) {
    return (
      <Detail
        markdown={SET_DEFAULT_TODO_LIST_INSTRUCTIONS}
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

  const splitConfig = defaultTodoListConfig.split("|");

  if (splitConfig.length !== 3) {
    // Config is invalid, remove it
    removeDefaultTodoListConfig();
  }

  return (
    <CreateTodoForm
      isLoading={isLoading}
      accountId={splitConfig[0]}
      projectId={parseInt(splitConfig[1])}
      todoListId={parseInt(splitConfig[2])}
      onSuccess={() => {
        showHUD("Todo created ✅", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      }}
    />
  );
}

export default withAccessToken(basecamp)(CreateTodoCommand);
