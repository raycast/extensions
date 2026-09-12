import { LocalStorage } from "@raycast/api";
import { WarpTemplate } from "./types";

export async function debugStorage() {
  console.log("🔍 Starting storage debug...");

  try {
    // Get all LocalStorage items
    const allItems = await LocalStorage.allItems();
    console.log("📦 All LocalStorage items:", allItems);

    // Specifically get templates
    const templatesRaw = await LocalStorage.getItem("project_templates");
    console.log("🎯 Raw templates data:", templatesRaw);

    if (templatesRaw) {
      try {
        const templates = JSON.parse(templatesRaw as string) as WarpTemplate[];
        console.log("📋 Parsed templates:", JSON.stringify(templates, null, 2));

        templates.forEach((template, index) => {
          console.log(`Template ${index + 1}:`, {
            id: template.id,
            name: template.name,
            splitDirection: template.splitDirection,
            isDefault: template.isDefault,
          });
        });
      } catch (parseError) {
        console.error("❌ Error parsing templates:", parseError);
      }
    } else {
      console.log("❌ No templates found in storage");
    }

    // Get directories too
    const directoriesRaw = await LocalStorage.getItem("project_directories");
    console.log("📁 Raw directories data:", directoriesRaw);
  } catch (error) {
    console.error("❌ Error debugging storage:", error);
  }
}
