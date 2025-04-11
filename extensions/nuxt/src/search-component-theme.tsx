import { showToast, Toast, LaunchProps, getPreferenceValues, open, getSelectedText } from "@raycast/api";
import { kebabCase, camelCase } from "scule";
import { components, proComponents, proseComponents } from "./components";

interface ComponentInfo {
  exists: boolean;
  isBase: boolean;
  isPro: boolean;
  isProse: boolean;
}

interface ComponentContext {
  name: string;
  sanitizedName: string;
  hasProsePrefix: boolean;
  componentInfo: ComponentInfo;
}

/**
 * Cleans and normalizes a component name
 * @param componentName - Name of the component to clean (e.g., 'UButton', 'ProseBadge')
 * @param prefix - Prefix to remove (e.g., 'U')
 * @returns The normalized component name in kebab-case
 */
function sanitizeComponentName(componentName: string, prefix: string): string {
  return kebabCase(componentName.replace(/^(Prose|prose)/, "").replace(prefix, ""));
}

/**
 * Determines component type and existence
 */
function getComponentInfo(sanitizedName: string): ComponentInfo {
  const camelCaseName = camelCase(sanitizedName);

  const isBase = components.includes(camelCaseName);
  const isPro = proComponents.includes(camelCaseName);
  const isProse = proseComponents.includes(camelCaseName);

  return {
    exists: isBase || isPro || isProse,
    isBase,
    isPro,
    isProse,
  };
}

/**
 * Builds the documentation URL based on component info and preferences
 */
function buildDocumentationUrl(context: ComponentContext, version: string): string {
  const { sanitizedName, hasProsePrefix, componentInfo } = context;
  const { isBase, isPro, isProse } = componentInfo;

  const baseUrl = version === "v3" ? "https://ui3.nuxt.dev" : "https://ui.nuxt.com";
  const versionUrl = isPro && version === "v2" ? `${baseUrl}/pro` : baseUrl;

  if (hasProsePrefix) {
    return `https://ui3.nuxt.dev/getting-started/typography#${sanitizedName.replace(/-/g, "")}`;
  }

  if (isProse && !isBase) {
    return `https://ui3.nuxt.dev/getting-started/typography#${sanitizedName.replace(/-/g, "")}`;
  }

  return `${versionUrl}/components/${sanitizedName}#theme`;
}

/**
 * Main function to handle component theme search
 */
export default async function SearchComponentTheme(props: LaunchProps<{ arguments: Arguments.SearchComponentTheme }>) {
  try {
    const { prefix, version } = getPreferenceValues<Preferences>();
    const name = props.arguments?.componentName ?? (await getSelectedText());

    if (!name) {
      await showToast(Toast.Style.Failure, "Please select a component name");
      return;
    }

    const hasProsePrefix = name.startsWith("Prose") || name.startsWith("prose");
    const sanitizedName = sanitizeComponentName(name, prefix);
    console.log(sanitizedName);
    const componentInfo = getComponentInfo(sanitizedName);

    if (!componentInfo.exists) {
      await showToast(Toast.Style.Failure, "Component not found");
      return;
    }

    const context: ComponentContext = {
      name,
      sanitizedName,
      hasProsePrefix,
      componentInfo,
    };

    const documentationUrl = buildDocumentationUrl(context, version);

    await showToast(Toast.Style.Animated, "Opening documentation...");
    await open(documentationUrl);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to open documentation");
  }
}
