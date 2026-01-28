import { LocalStorage } from "@raycast/api";
import { ProxyTemplate, TemplateStorageData } from "../types/template";
import { ProxySettings } from "../types/proxy";

export class TemplateManager {
  private static readonly STORAGE_KEY = "proxy-templates";

  // Get all templates from storage
  static async getTemplates(): Promise<ProxyTemplate[]> {
    try {
      const data = await LocalStorage.getItem<string>(this.STORAGE_KEY);
      if (!data) return [];

      const storageData: TemplateStorageData = JSON.parse(data);
      return storageData.templates.map((template) => ({
        ...template,
        createdAt: new Date(template.createdAt),
      }));
    } catch (error) {
      console.error("Error getting templates:", error);
      return [];
    }
  }

  // Save templates to storage
  static async saveTemplates(templates: ProxyTemplate[]): Promise<void> {
    try {
      const lastUsedSettings = await this.getLastUsedSettings();
      const storageData: TemplateStorageData = {
        templates,
        lastUsedSettings: lastUsedSettings || undefined,
      };
      await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error("Error saving templates:", error);
      throw error;
    }
  }

  // Add a new template
  static async addTemplate(name: string, description: string, settings: ProxySettings): Promise<void> {
    const templates = await this.getTemplates();
    const newTemplate: ProxyTemplate = {
      id: Date.now().toString(),
      name,
      description,
      settings,
      createdAt: new Date(),
    };

    templates.push(newTemplate);
    await this.saveTemplates(templates);
  }

  // Update a template
  static async updateTemplate(id: string, name: string, description: string, settings: ProxySettings): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex((t) => t.id === id);

    if (index === -1) {
      throw new Error("Template not found");
    }

    templates[index] = {
      ...templates[index],
      name,
      description,
      settings,
    };

    await this.saveTemplates(templates);
  }

  // Delete a template
  static async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filteredTemplates = templates.filter((t) => t.id !== id);
    await this.saveTemplates(filteredTemplates);
  }

  // Get a specific template
  static async getTemplate(id: string): Promise<ProxyTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id) || null;
  }

  // Save current settings as "last used"
  static async saveLastUsedSettings(settings: ProxySettings): Promise<void> {
    try {
      const templates = await this.getTemplates();
      const storageData: TemplateStorageData = {
        templates,
        lastUsedSettings: settings,
      };
      await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error("Error saving last used settings:", error);
      throw error;
    }
  }

  // Get last used settings
  static async getLastUsedSettings(): Promise<ProxySettings | null> {
    try {
      const data = await LocalStorage.getItem<string>(this.STORAGE_KEY);
      if (!data) return null;

      const storageData: TemplateStorageData = JSON.parse(data);
      return storageData.lastUsedSettings || null;
    } catch (error) {
      console.error("Error getting last used settings:", error);
      return null;
    }
  }

  // Create a template from current settings
  static async createTemplateFromCurrent(
    name: string,
    description: string,
    currentSettings: ProxySettings,
  ): Promise<void> {
    // Filter out only the enabled proxy settings
    const templateSettings: ProxySettings = {
      httpProxy: currentSettings.httpProxy,
      httpsProxy: currentSettings.httpsProxy,
      socksProxy: currentSettings.socksProxy,
      autoProxyUrl: currentSettings.autoProxyUrl,
      noProxy: currentSettings.noProxy,
      proxyEnabled: true, // Always set to true for templates
    };

    await this.addTemplate(name, description, templateSettings);
  }

  // Get all available templates including last used
  static async getAllAvailableTemplates(): Promise<ProxyTemplate[]> {
    const templates = await this.getTemplates();
    const lastUsedSettings = await this.getLastUsedSettings();

    const allTemplates = [...templates];

    // Add last used settings as a template if available
    if (lastUsedSettings && lastUsedSettings.proxyEnabled) {
      const lastUsedTemplate: ProxyTemplate = {
        id: "last-used",
        name: "Last Used Configuration",
        description: "The proxy configuration that was active before it was disabled",
        settings: lastUsedSettings,
        createdAt: new Date(),
        isLastUsed: true,
      };
      allTemplates.unshift(lastUsedTemplate);
    }

    return allTemplates;
  }

  // Format template for display
  static formatTemplateDisplay(template: ProxyTemplate): string {
    const parts: string[] = [];

    if (template.settings.httpProxy) {
      parts.push(`HTTP: ${template.settings.httpProxy}`);
    }
    if (template.settings.httpsProxy) {
      parts.push(`HTTPS: ${template.settings.httpsProxy}`);
    }
    if (template.settings.socksProxy) {
      parts.push(`SOCKS: ${template.settings.socksProxy}`);
    }
    if (template.settings.autoProxyUrl) {
      parts.push(`Auto: ${template.settings.autoProxyUrl}`);
    }

    return parts.join(", ") || "No proxy configured";
  }
}
