import { LaunchProps, Toast, getSelectedText, showToast, getPreferenceValues } from "@raycast/api";
import { openDocumentation, sanitizeComponentName, getComponentInfo } from "./utils/components";
import { handleCommandError } from "./utils/commands";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SearchComponentTheme }>) {
  try {
    const { prefix } = getPreferenceValues();
    const name = props.arguments?.componentName ?? (await getSelectedText()) ?? "";

    if (!name) {
      await showToast(Toast.Style.Failure, "Please select a component name");
      return;
    }

    const hasProsePrefix = name.startsWith("Prose") || name.startsWith("prose");
    const sanitizedName = sanitizeComponentName(name, prefix ?? "U");
    const componentInfo = getComponentInfo(sanitizedName);

    if (!componentInfo.exists) {
      await showToast(Toast.Style.Failure, "Component not found");
      return;
    }

    // Determine component type based on name
    let type: "base" | "prose" = "base";
    if (hasProsePrefix) {
      type = "prose";
    }

    // Create a component item to use with our utility functions
    const componentItem = {
      name: sanitizedName,
      type,
      camelCaseName: sanitizedName,
    };

    // Open the theme documentation
    await openDocumentation(componentItem, true);
  } catch (error) {
    await handleCommandError(error, "Failed to open documentation");
  }
}
