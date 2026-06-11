import { LocalStorage } from "@raycast/api";
import { WarpTemplate } from "./types";

const STORAGE_KEYS = {
  PROJECT_TEMPLATES: "project_templates",
} as const;

type StoredTemplate = Partial<WarpTemplate> & {
  id?: string;
  name?: string;
  commands?: Array<{ id?: string; title?: string; command?: string; workingDirectory?: string }>;
};

export async function debugTemplates() {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PROJECT_TEMPLATES);

  if (!stored) {
    console.log("No templates found in storage");
    return;
  }

  try {
    const templates = JSON.parse(stored) as StoredTemplate[];
    console.log("\n=== Templates in Storage ===");
    console.log("Total:", templates.length);

    templates.forEach((template, index) => {
      console.log(`\nTemplate ${index + 1}:`);
      console.log("  ID:", template.id);
      console.log("  Name:", template.name);
      console.log("  Terminal Type:", template.terminalType || "MISSING!");
      console.log("  Is Default:", template.isDefault);
      console.log("  Launch Mode:", template.launchMode);
      console.log("  Split Direction:", template.splitDirection);
      console.log("  Commands:", template.commands?.length || 0);
    });

    console.log("\n=== Raw JSON ===");
    console.log(JSON.stringify(templates, null, 2));
  } catch (error) {
    console.error("Error parsing templates:", error);
  }
}

export async function fixGhosttyTemplate(templateName: string) {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PROJECT_TEMPLATES);

  if (!stored) {
    console.log("No templates found");
    return;
  }

  try {
    const templates = JSON.parse(stored) as StoredTemplate[];
    const template = templates.find((item) => item.name === templateName);

    if (!template) {
      console.log("Template not found:", templateName);
      return;
    }

    console.log("Before fix:", template.terminalType);
    template.terminalType = "ghostty";
    console.log("After fix:", template.terminalType);

    await LocalStorage.setItem(STORAGE_KEYS.PROJECT_TEMPLATES, JSON.stringify(templates));
    console.log("Template fixed and saved!");
  } catch (error) {
    console.error("Error fixing template:", error);
  }
}
