import { Icon, List, showHUD } from "@raycast/api";
import { ExportActionPanels } from "./components";
import { safeAsyncOperation } from "./utils/errors";
import { exportSettingsToFile } from "./yaml-settings";
import { useReducer } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

type State = {
  isLoading: boolean;
  exportedFilePath: string | null;
  error: string | null;
};

type Action =
  | { type: "start" }
  | { type: "success"; filePath: string }
  | { type: "failure"; message: string }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...state, isLoading: true, error: null };
    case "success":
      return { isLoading: false, exportedFilePath: action.filePath, error: null };
    case "failure":
      return { ...state, isLoading: false, error: action.message };
    case "reset":
      return { isLoading: false, exportedFilePath: null, error: null };
    default:
      return state;
  }
}

export default function ExportAppsCommand() {
  const [{ isLoading, exportedFilePath, error }, dispatch] = useReducer(reducer, {
    isLoading: false,
    exportedFilePath: null,
    error: null,
  });

  const handleExport = async () => {
    dispatch({ type: "start" });

    const result = await safeAsyncOperation(
      async () => {
        const filePath = await exportSettingsToFile();
        dispatch({ type: "success", filePath });
        await showHUD("Apps Exported Successfully");
        return filePath;
      },
      "Export settings",
      { toastTitle: "Export Failed" },
    );

    if (!result) {
      dispatch({ type: "failure", message: "Export failed" });
    }
  };

  const showInFinder = async () => {
    if (!exportedFilePath) return;

    await safeAsyncOperation(
      async () => {
        await execAsync(`open -R "${exportedFilePath}"`);
      },
      "Show file in Finder",
      { toastTitle: "Error" },
    );
  };

  const getEmptyStateProps = () => {
    if (exportedFilePath) {
      return {
        icon: Icon.CheckCircle,
        title: "Export Complete",
        description: "Your app settings have been exported successfully.",
        actions: <ExportActionPanels state="success" onExport={handleExport} onShowInFinder={showInFinder} />,
      };
    }

    if (error) {
      return {
        icon: Icon.XMarkCircle,
        title: "Export Failed",
        description: error,
        actions: <ExportActionPanels state="error" onExport={handleExport} />,
      };
    }

    return {
      icon: { source: "at-icon@128px.png" },
      title: "Export Apps",
      description: "Export your Apps and Profile history to a YAML file.",
      actions: <ExportActionPanels state="initial" onExport={handleExport} />,
    };
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView {...getEmptyStateProps()} />
    </List>
  );
}
