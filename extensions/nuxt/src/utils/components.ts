import { Icon, open, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { camelCase, kebabCase, pascalCase } from "scule";
import type { ComponentInfo, ComponentContext } from "../types/components";
import { getDocsUrl } from "./search";
import { showAnimatedToast, showSuccessToast } from "./commands";

// Component catalogs
export const components = [
  "app",
  "accordion",
  "alert",
  "authForm",
  "avatar",
  "avatarGroup",
  "badge",
  "banner",
  "blogPost",
  "blogPosts",
  "breadcrumb",
  "button",
  "buttonGroup",
  "calendar",
  "card",
  "carousel",
  "changelogVersion",
  "changelogVersions",
  "chatMessage",
  "chatMessages",
  "chatPalette",
  "chatPrompt",
  "chatPromptSubmit",
  "checkbox",
  "chip",
  "collapsible",
  "colorModeAvatar",
  "colorModeButton",
  "colorModeImage",
  "colorModeSelect",
  "colorModeSwitch",
  "colorPicker",
  "commandPalette",
  "container",
  "contentNavigation",
  "contentSearch",
  "contentSearchButton",
  "contentSurround",
  "contentToc",
  "contextMenu",
  "dashboardGroup",
  "dashboardNavbar",
  "dashboardPanel",
  "dashboardResizeHandle",
  "dashboardSearch",
  "dashboardSearchButton",
  "dashboardSidebar",
  "dashboardSidebarCollapse",
  "dashboardSidebarToggle",
  "dashboardToolbar",
  "drawer",
  "dropdownMenu",
  "error",
  "fileUpload",
  "footer",
  "footerColumns",
  "form",
  "formField",
  "header",
  "icon",
  "input",
  "inputMenu",
  "inputNumber",
  "inputTags",
  "kbd",
  "link",
  "localeSelect",
  "main",
  "marquee",
  "modal",
  "navigationMenu",
  "page",
  "pageAnchors",
  "pageAside",
  "pageBody",
  "pageCard",
  "pageColumns",
  "pageCta",
  "pageFeature",
  "pageGrid",
  "pageHeader",
  "pageHero",
  "pageLinks",
  "pageList",
  "pageLogos",
  "pageSection",
  "pagination",
  "pinInput",
  "popover",
  "pricingPlan",
  "pricingPlans",
  "pricingTable",
  "progress",
  "radioGroup",
  "select",
  "selectMenu",
  "separator",
  "skeleton",
  "slideover",
  "slider",
  "stepper",
  "switch",
  "table",
  "tabs",
  "textarea",
  "timeline",
  "toast",
  "tooltip",
  "tree",
  "user",
];

export const proseComponents = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "a",
  "blockquote",
  "strong",
  "em",
  "ul",
  "ol",
  "hr",
  "table",
  "img",
  "code",
  "pre",
  "accordion",
  "badge",
  "card",
  "cardGroup",
  "codeCollapse",
  "codeGroup",
  "codePreview",
  "codeTree",
  "collapsible",
  "field",
  "fieldGroup",
  "icon",
  "kbd",
  "tabs",
  "steps",
];

// Types and helpers
export interface ComponentItem {
  name: string;
  type: "base" | "prose";
  camelCaseName: string;
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getFormattedComponentName(component: ComponentItem): string {
  const { prefix } = getPreferenceValues();

  if (component.type === "base") {
    return prefix + pascalCase(component.camelCaseName);
  } else if (component.type === "prose") {
    return "Prose" + capitalizeFirstLetter(component.camelCaseName);
  } else {
    return pascalCase(component.camelCaseName);
  }
}

export function getDisplayName(component: ComponentItem): string {
  return capitalizeFirstLetter(component.camelCaseName);
}

/**
 * Cleans and normalizes a component name
 * @param componentName - Name of the component to clean (e.g., 'UButton', 'ProseBadge')
 * @param prefix - Prefix to remove (e.g., 'U')
 * @returns The normalized component name in kebab-case
 */
export function sanitizeComponentName(componentName: string, prefix: string): string {
  return kebabCase(componentName.replace(/^(Prose|prose)/, "").replace(prefix, ""));
}

/**
 * Determines component type and existence
 */
export function getComponentInfo(sanitizedName: string): ComponentInfo {
  const camelCaseName = camelCase(sanitizedName);

  const isBase = components.includes(camelCaseName);
  const isProse = proseComponents.includes(camelCaseName);

  return {
    exists: isBase || isProse,
    isBase,
    isProse,
  };
}

/**
 * Builds the documentation URL based on component info and preferences
 */
export function buildDocumentationUrl(context: ComponentContext): string {
  const docsUrl = getDocsUrl();
  const { sanitizedName, hasProsePrefix, componentInfo } = context;
  const { isBase, isProse } = componentInfo;

  if (hasProsePrefix || (isProse && !isBase)) {
    const prose = sanitizedName;

    // Headers & text page anchors
    const headersAndTextAnchors: Record<string, string> = {
      h1: "heading-1",
      h2: "heading-2",
      h3: "heading-3",
      h4: "heading-4",
      p: "paragraph",
      strong: "strong",
      em: "emphasis",
      a: "links",
      blockquote: "blockquotes",
      hr: "horizontal-rules",
    };

    if (prose in headersAndTextAnchors) {
      return `${docsUrl}/typography/headers-and-text#${headersAndTextAnchors[prose]}`;
    }

    // Lists and tables page anchors
    const listsAndTablesAnchors: Record<string, string> = {
      ul: "unordered-list",
      ol: "ordered-list",
      table: "table",
    };
    if (prose in listsAndTablesAnchors) {
      return `${docsUrl}/typography/lists-and-tables#${listsAndTablesAnchors[prose]}`;
    }

    // Code page
    if (prose === "code" || prose === "pre") {
      return `${docsUrl}/typography/code`;
    }

    // Images and embeds page
    if (prose === "img") {
      return `${docsUrl}/typography/images-and-embeds`;
    }

    // Typography components pages (accordion, badge, card, ...)
    return `${docsUrl}/typography/${prose}`;
  }

  return `${docsUrl}/components/${sanitizedName}#theme`;
}

export function getComponentIcon(type: ComponentItem["type"]): Icon {
  switch (type) {
    case "base":
      return Icon.Box;
    case "prose":
      return Icon.Text;
    default:
      return Icon.Box;
  }
}

export function getComponentTypeLabel(type: ComponentItem["type"]): string {
  switch (type) {
    case "base":
      return "Base Component";
    case "prose":
      return "Prose Component";
    default:
      return "";
  }
}

export function createComponentContext(component: ComponentItem): ComponentContext {
  const hasProsePrefix = component.type === "prose";
  const sanitizedName = component.name;
  const componentInfo = getComponentInfo(sanitizedName);

  return {
    name: getFormattedComponentName(component),
    sanitizedName,
    hasProsePrefix,
    componentInfo,
  };
}

export async function openDocumentation(component: ComponentItem, showTheme: boolean = false): Promise<void> {
  try {
    const context = createComponentContext(component);

    if (!context.componentInfo.exists) {
      await showToast(Toast.Style.Failure, "Component not found");
      return;
    }

    let documentationUrl = buildDocumentationUrl(context);
    if (!showTheme) {
      documentationUrl = documentationUrl.replace(/#theme$/, "");
    }

    await showAnimatedToast(`Opening ${showTheme ? "theme " : ""}documentation...`);
    await open(documentationUrl);
    await showSuccessToast("Documentation opened successfully");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open documentation" });
  }
}
