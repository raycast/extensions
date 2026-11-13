import { Action, ActionPanel, Color, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  PhiVersionRequirement,
  runPhiAction,
  runPhiCommand,
} from "./command-compatibility";
import { PhiErrorView } from "./components/error-view";
import {
  addSplitView,
  forceReloadTab,
  getTabs,
  MINIMUM_PHI_VERSION,
  openTab,
  reloadTab,
} from "./phi";
import { PhiError, PhiTab } from "./types";
import { runWindowCommand } from "./window-command";

type PhiActionID =
  | "manage-extensions"
  | "refresh-page"
  | "force-refresh-page"
  | "add-split-view";

interface PhiActionItem extends PhiVersionRequirement {
  id: PhiActionID;
  title: string;
  subtitle: string;
  icon: Image.ImageLike;
  successTitle: string;
  failureTitle: string;
}

const manageExtensionsIcon: Image.ImageLike = {
  source: "puzzlepiece.extension.svg",
  tintColor: Color.PrimaryText,
};
const refreshIcon: Image.ImageLike = {
  source: "arrow.clockwise.svg",
  tintColor: Color.PrimaryText,
};
const splitViewIcon: Image.ImageLike = {
  source: "square.split.2x1.padded.svg",
  tintColor: Color.PrimaryText,
};

const actions: PhiActionItem[] = [
  {
    id: "manage-extensions",
    minimumPhiVersion: MINIMUM_PHI_VERSION,
    title: "Manage Extensions",
    subtitle: "Open Phi's extension management page",
    icon: manageExtensionsIcon,
    successTitle: "Opened Extensions",
    failureTitle: "Could Not Open Extensions",
  },
  {
    id: "refresh-page",
    minimumPhiVersion: MINIMUM_PHI_VERSION,
    title: "Refresh the Page",
    subtitle: "Reload the active Phi tab",
    icon: refreshIcon,
    successTitle: "Refreshed Page",
    failureTitle: "Could Not Refresh Page",
  },
  {
    id: "force-refresh-page",
    minimumPhiVersion: MINIMUM_PHI_VERSION,
    title: "Force Refresh the Page",
    subtitle: "Reload the active Phi tab without cached resources",
    icon: refreshIcon,
    successTitle: "Force Refreshed Page",
    failureTitle: "Could Not Force Refresh Page",
  },
  {
    id: "add-split-view",
    minimumPhiVersion: MINIMUM_PHI_VERSION,
    title: "Add Split View",
    subtitle: "Open a new tab beside the active Phi tab",
    icon: splitViewIcon,
    successTitle: "Added Split View",
    failureTitle: "Could Not Add Split View",
  },
];

async function getActiveTab(): Promise<PhiTab> {
  const results = await getTabs({ kind: "current" });
  const activeTab = results.tabs.find((tab) => tab.isActive);
  if (!activeTab) {
    throw new PhiError("operationFailed", "Phi has no active tab.");
  }
  return activeTab;
}

async function executeAction(action: PhiActionID): Promise<void> {
  if (action === "manage-extensions") {
    await openTab("phi://extensions");
    return;
  }

  const activeTab = await getActiveTab();
  switch (action) {
    case "refresh-page":
      await reloadTab(activeTab);
      break;
    case "force-refresh-page":
      await forceReloadTab(activeTab);
      break;
    case "add-split-view":
      await addSplitView(activeTab);
      break;
  }
}

export default function PhiActions() {
  const { data, error, revalidate } = useCachedPromise(() =>
    runPhiCommand("phi-actions", () => true),
  );

  if (error) {
    return <PhiErrorView error={error} onRetry={revalidate} />;
  }
  if (!data) {
    return <List isLoading />;
  }

  return (
    <List searchBarPlaceholder="Search Phi actions">
      {actions.map((action) => (
        <List.Item
          key={action.id}
          title={action.title}
          subtitle={action.subtitle}
          icon={action.icon}
          actions={
            <ActionPanel>
              <Action
                title={action.title}
                icon={action.icon}
                onAction={() =>
                  runWindowCommand(
                    () =>
                      runPhiAction("phi-actions", action.id, action, () =>
                        executeAction(action.id),
                      ),
                    action.successTitle,
                    action.failureTitle,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
