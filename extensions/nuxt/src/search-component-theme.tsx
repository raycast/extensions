import { LaunchProps, Toast, getSelectedText, showToast } from "@raycast/api";
import { openDocumentation } from "./utils/component";
import { sanitizeComponentName, getComponentInfo } from "./utils/components";
import { getExtensionPreferences, handleCommandError } from "./utils/commands";

/**
 * Main function to handle component theme search
 */
export default async function SearchComponentTheme(props: LaunchProps<{ arguments: Arguments.SearchComponentTheme }>) {
  try {
    const { prefix, version: defaultVersion } = getExtensionPreferences();
    const version = props.arguments?.version || defaultVersion;
    const name = props.arguments?.componentName ?? (await getSelectedText());

    if (!name) {
      await showToast(Toast.Style.Failure, "Please select a component name");
      return;
    }

    // Create a temporary component item to use with our utility functions
    const hasProsePrefix = name.startsWith("Prose") || name.startsWith("prose");
    const sanitizedName = sanitizeComponentName(name, prefix);
    const componentInfo = getComponentInfo(sanitizedName);

    if (!componentInfo.exists) {
      await showToast(Toast.Style.Failure, "Component not found");
      return;
    }

    // Determine component type based on name
    let type: "base" | "pro" | "prose" = "base";
    if (hasProsePrefix) {
      type = "prose";
    } else if (name.includes("Dashboard") || name.includes("Page") || name.includes("Color")) {
      type = "pro";
    }

    // Create a component item to use with our utility functions
    const componentItem = {
      name: sanitizedName,
      type,
      camelCaseName: sanitizedName,
    };

    // Open the theme documentation with the specified version
    await openDocumentation(componentItem, true, version);
  } catch (error) {
    await handleCommandError(error, "Failed to open documentation");
  }
}
