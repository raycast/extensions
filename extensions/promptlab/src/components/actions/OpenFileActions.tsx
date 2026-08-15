import { Action, Icon, environment } from "@raycast/api";
import {
  ADVANCED_SETTINGS_FILENAME,
  CUSTOM_PLACEHOLDERS_FILENAME,
  PLACEHOLDERS_GUIDE_FILENAME,
} from "../../lib/common/constants";
import path from "path";
import { defaultAdvancedSettings } from "../../data/default-advanced-settings";
import { getActionShortcut, isActionEnabled } from "../../lib/actions";

/**
 * Action to open the placeholders guide in the default markdown text editor.
 */
export function OpenPlaceholdersGuideAction(props: { settings: typeof defaultAdvancedSettings }) {
  const { settings } = props;

  if (!isActionEnabled("OpenPlaceholdersGuideAction", settings)) {
    return null;
  }

  const targetApp = settings.actionSettings.OpenPlaceholdersGuideAction.openIn;

  const placeholdersGuidePath = path.join(environment.assetsPath, PLACEHOLDERS_GUIDE_FILENAME);
  return (
    <Action.Open
      title="Open Placeholders Guide"
      target={placeholdersGuidePath}
      application={targetApp == "default" ? undefined : targetApp}
      shortcut={getActionShortcut("OpenPlaceholdersGuideAction", settings)}
    />
  );
}

/**
 * Action to open the custom placeholders file in the default JSON text editor.
 */
export function EditCustomPlaceholdersAction(props: { settings: typeof defaultAdvancedSettings }) {
  const { settings } = props;

  if (!isActionEnabled("EditCustomPlaceholdersAction", settings)) {
    return null;
  }

  const targetApp = settings.actionSettings.EditCustomPlaceholdersAction.openIn;

  const customPlaceholdersPath = path.join(environment.supportPath, CUSTOM_PLACEHOLDERS_FILENAME);
  return (
    <Action.Open
      title="Edit Custom Placeholders"
      target={customPlaceholdersPath}
      application={targetApp == "default" ? undefined : targetApp}
      icon={Icon.Underline}
      shortcut={getActionShortcut("EditCustomPlaceholdersAction", settings)}
    />
  );
}

/**
 * Action to open the advanced settings file in the default JSON text editor.
 */
export function OpenAdvancedSettingsAction(props: { settings: typeof defaultAdvancedSettings }) {
  const { settings } = props;

  if (!isActionEnabled("OpenAdvancedSettingsAction", settings)) {
    return null;
  }

  const targetApp = settings.actionSettings.OpenAdvancedSettingsAction.openIn;

  const advancedSettingsPath = path.join(environment.supportPath, ADVANCED_SETTINGS_FILENAME);
  return (
    <Action.Open
      title="Open Advanced Settings"
      target={advancedSettingsPath}
      icon={Icon.Cog}
      shortcut={getActionShortcut("OpenAdvancedSettingsAction", settings)}
      application={targetApp == "default" ? undefined : targetApp}
    />
  );
}
