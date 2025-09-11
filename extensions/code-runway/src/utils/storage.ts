import { LocalStorage } from "@raycast/api";
import { ProjectDirectory, WarpTemplate } from "../types";

const STORAGE_KEYS = {
  PROJECT_DIRECTORIES: "project_directories",
  PROJECT_TEMPLATES: "project_templates",
} as const;

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
  static async getTemplates(): Promise<WarpTemplate[]> {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PROJECT_TEMPLATES);
    if (!stored) return this.getDefaultTemplates();

    try {
      const parsed = JSON.parse(stored);
      if (parsed.length === 0) {
        return this.getDefaultTemplates();
      }
      return parsed;
    } catch {
      return this.getDefaultTemplates();
    }
  }

  static async saveTemplates(templates: WarpTemplate[]): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEYS.PROJECT_TEMPLATES, JSON.stringify(templates));
  }

  static async addTemplate(template: WarpTemplate): Promise<void> {
    const templates = await this.getTemplates();
    const existingIndex = templates.findIndex((t) => t.id === template.id);

    // If setting a template as default, unset other defaults
    if (template.isDefault) {
      templates.forEach((t) => (t.isDefault = false));
    }

    if (existingIndex >= 0) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }

    await this.saveTemplates(templates);
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

  static getDefaultTemplates(): WarpTemplate[] {
    return [
      {
        id: "default-template",
        name: "Default Template",
        description: "A simple template to open the project in a new tab.",
        splitDirection: "vertical",
        launchMode: "multi-tab",
        isDefault: true,
        commands: [
          {
            id: "1",
            title: "Main Terminal",
            command: "echo 'Project Opened'",
          },
        ],
      },
    ];
  }
}
