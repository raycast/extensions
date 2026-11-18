import { ActionPanel, Action, Icon } from "@raycast/api";
import { ModelDetailForm } from "../views/ModelDetailForm";
import { getOrganizationLogo } from "../../utils/organization-logos";
import { useModels } from "../../utils/use-models";

/**
 * Action to show model details in a form
 */
export function ShowDetailsAction({ modelId }: { modelId: string }) {
  return <Action.Push title="Show Details" target={<ModelDetailForm modelId={modelId} />} icon={Icon.Info} />;
}

/**
 * Action to open model details in browser
 */
export function ModelDetailsLinkAction({ modelId }: { modelId: string }) {
  return <Action.OpenInBrowser title="Show in Browser" url={`https://llm-stats.com/models/${modelId}`} />;
}

/**
 * Action to open model playground in browser
 */
export function OpenPlaygroundAction({ modelId }: { modelId: string }) {
  return (
    <Action.OpenInBrowser
      title="Open Playground"
      url={`https://llm-stats.com/playground?m1=${modelId}`}
      icon={Icon.GameController}
    />
  );
}

/**
 * Submenu action to compare model with other models
 */
export function CompareWithSubmenu({ modelId }: { modelId: string }) {
  // Fetch models list but don't execute the promise (use cached data if available)
  const { data: allModels } = useModels(true, true, false);

  // Filter out current model from comparison list
  const otherModels = allModels?.filter((model) => model.model_id !== modelId) || [];

  if (otherModels.length === 0) {
    return null;
  }

  return (
    <ActionPanel.Submenu
      title="Compare with"
      icon={`https://api.iconify.design/material-symbols/compare-arrows-rounded.svg`}
    >
      {otherModels.map((otherModel) => (
        <Action.OpenInBrowser
          key={otherModel.model_id}
          title={otherModel.name}
          url={`https://llm-stats.com/models/compare/${modelId}-vs-${otherModel.model_id}`}
          icon={getOrganizationLogo(otherModel.organization_id)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
