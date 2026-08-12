import { LocalStorage, environment } from "@raycast/api";
import { ProjectDirectory, TerminalType, WarpTemplate } from "../types";
import { getAvailableEditors, getEditorDisplayName } from "./editorLauncher";
import { templateEvents } from "./templateEvents";

const STORAGE_KEYS = {
  PROJECT_DIRECTORIES: "project_directories",
  PROJECT_TEMPLATES: "project_templates",
  RECOMMENDED_EDITOR_TEMPLATES_SYNCED: "recommended_editor_templates_synced",
} as const;

type StoredTemplate = Partial<WarpTemplate> & {
  id?: string;
  name?: string;
};

const TERMINAL_TYPES: TerminalType[] = ["warp", "ghostty", "iterm", "cmux"];

/**
 * Project Directory Management
 */
export class ProjectDirectoryStorage {
  static async getDirectories(): Promise<ProjectDirectory[]> {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PROJECT_DIRECTORIES);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  static async saveDirectories(directories: ProjectDirectory[]): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEYS.PROJECT_DIRECTORIES, JSON.stringify(directories));
  }

  static async addDirectory(directory: ProjectDirectory): Promise<void> {
    const directories = await this.getDirectories();
    const existing = directories.find((d) => d.path === directory.path);

    if (!existing) {
      directories.push(directory);
      await this.saveDirectories(directories);
    }
  }

  static async removeDirectory(path: string): Promise<void> {
    const directories = await this.getDirectories();
    const filtered = directories.filter((d) => d.path !== path);
    await this.saveDirectories(filtered);
  }

  static async toggleDirectory(path: string): Promise<void> {
    const directories = await this.getDirectories();
    const directory = directories.find((d) => d.path === path);

    if (directory) {
      directory.enabled = !directory.enabled;
      await this.saveDirectories(directories);
    }
  }
}

/**
 * Project Template Management
 */
export class ProjectTemplateStorage {
  private static normalizeTemplates(parsed: StoredTemplate[]): { templates: WarpTemplate[]; changed: boolean } {
    const DEBUG = environment.isDevelopment;
    let changed = false;

    const migratedTemplates = parsed
      .filter(
        (template): template is StoredTemplate & Pick<WarpTemplate, "id" | "name" | "description"> =>
          typeof template.id === "string" &&
          typeof template.name === "string" &&
          typeof template.description === "string",
      )
      .map((template) => {
        const launcherKind =
          template.launcherKind === "editor" ? "editor" : template.launcherKind === "script" ? "script" : "terminal";
        const isRecommendedEditorTemplate = launcherKind === "editor" && template.id.startsWith("recommended-editor:");
        const normalizedEditorType = launcherKind === "editor" ? template.editorType || "Cursor" : undefined;
        const normalizedScriptContent = launcherKind === "script" ? template.scriptContent?.trim() || "" : undefined;

        const migrated: WarpTemplate = {
          ...template,
          launcherKind,
          terminalType:
            launcherKind === "terminal" && template.terminalType && TERMINAL_TYPES.includes(template.terminalType)
              ? template.terminalType
              : launcherKind === "terminal"
                ? "warp"
                : undefined,
          editorType: launcherKind === "editor" ? normalizedEditorType : undefined,
          scriptContent: normalizedScriptContent,
          commands: launcherKind === "terminal" ? (Array.isArray(template.commands) ? template.commands : []) : [],
          splitDirection: template.splitDirection === "horizontal" ? "horizontal" : "vertical",
          launchMode:
            template.launchMode === "split-panes" ||
            template.launchMode === "multi-tab" ||
            template.launchMode === "multi-window"
              ? template.launchMode
              : "multi-tab",
          ghosttyAutoRun: template.ghosttyAutoRun ?? false,
          name:
            isRecommendedEditorTemplate && normalizedEditorType
              ? `Open in ${getEditorDisplayName(normalizedEditorType)}`
              : template.name,
          description: isRecommendedEditorTemplate ? "" : template.description,
        };

        if (
          migrated.launcherKind !== template.launcherKind ||
          migrated.name !== template.name ||
          migrated.description !== template.description ||
          migrated.editorType !== template.editorType ||
          migrated.scriptContent !== template.scriptContent ||
          (launcherKind === "terminal" && !Array.isArray(template.commands)) ||
          (launcherKind !== "terminal" && Array.isArray(template.commands) && template.commands.length > 0)
        ) {
          changed = true;
        }

        if (DEBUG) {
          console.log(
            `Reading template: ${template.name}, launcherKind: ${template.launcherKind} -> ${migrated.launcherKind}, terminalType: ${template.terminalType} -> ${migrated.terminalType}, editorType: ${template.editorType} -> ${migrated.editorType}`,
          );
        }

        return migrated;
      });

    if (DEBUG) {
      console.log("=== Storage.getTemplates ===");
      console.log("Total templates:", migratedTemplates.length);
    }

    return { templates: migratedTemplates, changed };
  }

  private static buildRecommendedEditorTemplates(existingTemplates: WarpTemplate[]): WarpTemplate[] {
    const existingEditorTypes = new Set(
      existingTemplates
        .filter((template) => template.launcherKind === "editor" && template.editorType)
        .map((template) => template.editorType),
    );

    return getAvailableEditors()
      .filter((editor) => !existingEditorTypes.has(editor.editorType))
      .map((editor) => ({
        id: `recommended-editor:${editor.editorType}`,
        name: `Open in ${editor.title}`,
        description: "",
        launcherKind: "editor" as const,
        editorType: editor.editorType,
        splitDirection: "vertical",
        launchMode: "multi-tab",
        isDefault: false,
        commands: [],
      }));
  }

  private static async maybeAutoSyncRecommendedEditorTemplates(templates: WarpTemplate[]): Promise<WarpTemplate[]> {
    const recommendedTemplates = this.buildRecommendedEditorTemplates(templates);

    if (recommendedTemplates.length === 0) {
      return templates;
    }

    const mergedTemplates = [...templates, ...recommendedTemplates];
    await this.saveTemplates(mergedTemplates);
    return mergedTemplates;
  }

  static async getTemplates(): Promise<WarpTemplate[]> {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PROJECT_TEMPLATES);
    if (!stored) {
      const defaultTemplates = await this.maybeAutoSyncRecommendedEditorTemplates(this.getDefaultTemplates());
      return defaultTemplates;
    }

    try {
      const parsed = JSON.parse(stored) as StoredTemplate[];
      if (parsed.length === 0) {
        const defaultTemplates = await this.maybeAutoSyncRecommendedEditorTemplates(this.getDefaultTemplates());
        return defaultTemplates;
      }

      const normalized = this.normalizeTemplates(parsed);
      const templates = await this.maybeAutoSyncRecommendedEditorTemplates(normalized.templates);

      if (normalized.changed) {
        await this.saveTemplates(templates);
      }

      return templates;
    } catch {
      const defaultTemplates = await this.maybeAutoSyncRecommendedEditorTemplates(this.getDefaultTemplates());
      return defaultTemplates;
    }
  }

  static async saveTemplates(templates: WarpTemplate[]): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEYS.PROJECT_TEMPLATES, JSON.stringify(templates));
    // Notify cached views that template state changed.
    templateEvents.emit();
  }

  static async addTemplate(template: WarpTemplate): Promise<void> {
    const DEBUG = environment.isDevelopment;
    if (DEBUG) {
      console.log("=== Storage.addTemplate ===");
      console.log("Adding/updating template:", {
        id: template.id,
        name: template.name,
        launcherKind: template.launcherKind,
        terminalType: template.terminalType, // Include terminal type in debug output.
        editorType: template.editorType,
        hasScriptContent: Boolean(template.scriptContent?.trim()),
        splitDirection: template.splitDirection,
        isDefault: template.isDefault,
      });
    }

    const templates = await this.getTemplates();
    const existingIndex = templates.findIndex((t) => t.id === template.id);

    // If setting a template as default, unset other defaults
    if (template.isDefault) {
      templates.forEach((t) => (t.isDefault = false));
    }

    if (existingIndex >= 0) {
      if (DEBUG) {
        console.log("Updating existing template at index:", existingIndex);
        console.log("Old launcherKind:", templates[existingIndex].launcherKind);
        console.log("New launcherKind:", template.launcherKind);
        console.log("Old terminalType:", templates[existingIndex].terminalType);
        console.log("New terminalType:", template.terminalType);
        console.log("Old editorType:", templates[existingIndex].editorType);
        console.log("New editorType:", template.editorType);
        console.log("Old hasScriptContent:", Boolean(templates[existingIndex].scriptContent?.trim()));
        console.log("New hasScriptContent:", Boolean(template.scriptContent?.trim()));
      }
      templates[existingIndex] = template;
    } else {
      if (DEBUG) console.log("Adding new template");
      templates.push(template);
    }

    if (DEBUG) {
      console.log("About to save templates. Total:", templates.length);
      templates.forEach((t, i) => {
        console.log(`  Template ${i}: ${t.name} - ${t.launcherKind} - ${t.terminalType ?? t.editorType ?? "script"}`);
      });
    }

    await this.saveTemplates(templates);
    if (DEBUG) console.log("Template saved and event emitted");
  }

  static async getDefaultTemplate(): Promise<WarpTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.isDefault) || null;
  }

  static async removeTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    await this.saveTemplates(filtered);
  }

  static async syncRecommendedEditorTemplates(): Promise<{ addedCount: number; totalCount: number }> {
    const templates = await this.getTemplates();
    const recommendedTemplates = this.buildRecommendedEditorTemplates(templates);

    if (recommendedTemplates.length === 0) {
      return { addedCount: 0, totalCount: templates.length };
    }

    const mergedTemplates = [...templates, ...recommendedTemplates];
    await this.saveTemplates(mergedTemplates);
    await LocalStorage.setItem(STORAGE_KEYS.RECOMMENDED_EDITOR_TEMPLATES_SYNCED, "true");

    return { addedCount: recommendedTemplates.length, totalCount: mergedTemplates.length };
  }

  static getDefaultTemplates(): WarpTemplate[] {
    return [
      {
        id: "default-template",
        name: "Default Template",
        description: "A simple template that opens the project in a new tab.",
        launcherKind: "terminal",
        terminalType: "warp",
        splitDirection: "vertical",
        launchMode: "multi-tab",
        isDefault: true,
        commands: [
          {
            id: "1",
            title: "Main Terminal",
            command: "echo 'Project opened'",
          },
        ],
      },
    ];
  }
}
