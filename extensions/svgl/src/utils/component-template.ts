import { Clipboard, Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { fetchSvg } from "./fetch";
import { parseSvgContent } from "./parse-svg";

const componentTemplate = async (lang: string, url: string, framework: "Vue" | "Svelte") => {
  const svg = await fetchSvg(url);

  const { templateContent, componentStyle } = parseSvgContent(svg, framework);

  if (framework === "Vue") {
    return `<script setup${lang ? ` lang="${lang}"` : ""}></script>
<template>
 ${templateContent}
</template>
  
    ${componentStyle}
    `;
  } else {
    return `<script${lang ? ` lang="${lang}"` : ""}></script>
 ${templateContent}
  
${componentStyle}
    `;
  }
};

export const generateComponentAndCopy = async (lang: string, url: string, framework: "Vue" | "Svelte") => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Fetching ${framework} component`,
  });

  try {
    const component = await componentTemplate(lang, url, framework);
    await toast.hide();
    Clipboard.copy(component);
    showHUD(`Copied ${framework} component to clipboard`);
    closeMainWindow();
  } catch (error) {
    if (error instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to fetch ${framework.toLowerCase()} component`,
        message: error.message,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to fetch ${framework.toLowerCase()} component`,
      });
    }
    return;
  }
};
