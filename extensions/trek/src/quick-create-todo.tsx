import { LaunchProps, Toast, showHUD, PopToRootType, launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { basecamp, createTodo } from "./oauth/auth";

// Define the arguments type for QuickCreateTodo
interface Arguments {
  "todo-name": string;
  "todo-description"?: string;
}

type QuickAddTaskProps = { arguments: Arguments } & LaunchProps;

// Helper function to clean string values from unexpected quotes
function cleanStringValue(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

async function QuickAddTask(props: QuickAddTaskProps) {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating todo" });
  await toast.show();

  try {
    // Use LocalStorage API directly instead of useLocalStorage hook
    const defaultTodoListConfig = await LocalStorage.getItem<string>("defaultTodoListConfig");

    if (!defaultTodoListConfig) {
      toast.style = Toast.Style.Failure;
      toast.title = "No default todo list set";
      toast.message = "Please set a default todo list first";

      // Add action to open the view-all-basecamps command
      toast.primaryAction = {
        title: "Open View All Basecamps",
        onAction: () => {
          launchCommand({ name: "view-all-basecamps", type: LaunchType.UserInitiated });
        },
      };
      return;
    }

    const splitConfig = defaultTodoListConfig.split("|");

    if (splitConfig.length !== 3) {
      toast.style = Toast.Style.Failure;
      toast.title = "Invalid todo list configuration";
      toast.message = "Please set a new default todo list";

      // Add action to open the view-all-basecamps command
      toast.primaryAction = {
        title: "Open View All Basecamps",
        onAction: () => {
          launchCommand({ name: "view-all-basecamps", type: LaunchType.UserInitiated });
        },
      };
      return;
    }

    // Clean the values from any unexpected quotes
    const accountId = cleanStringValue(splitConfig[0]);
    const projectId = parseInt(cleanStringValue(splitConfig[1]));
    const todoListId = parseInt(cleanStringValue(splitConfig[2]));

    // Create the todo with the provided name and description
    await createTodo(accountId, projectId, todoListId, {
      content: props.arguments["todo-name"],
      description: props.arguments["todo-description"]
        ? `<div>${props.arguments["todo-description"]}</div>`
        : undefined,
    });

    toast.style = Toast.Style.Success;
    toast.title = "Todo created";

    // Show HUD notification
    showHUD("Todo created ✅", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  } catch (error) {
    showFailureToast(error, { title: "Failed to create todo" });
  }
}

export default withAccessToken(basecamp)(QuickAddTask);
