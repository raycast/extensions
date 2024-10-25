import { LocalStorage, environment } from "@raycast/api";
import { writeFile, readdir, mkdir, unlink } from "fs/promises";
import path from "path";
import { Prompt } from "./types";

interface ExportData {
  version: string;
  exportDate: string;
  prompts: Prompt[];
}

interface BackupData {
  version: string;
  timestamp: string;
  prompts: Prompt[];
}

export class PromptStore {
  private static readonly OLD_KEY = "ai-prompts";
  private static readonly NEW_KEY = "promptbase-prompts";

  static async createAutoBackup() {
    try {
      const prompts = await this.getPrompts();
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        prompts
      };
  
      const backupPath = path.join(environment.supportPath, 'backups');
      await mkdir(backupPath, { recursive: true });
      
      // Add timestamp with hours and minutes to make each backup unique
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, -5); // Remove seconds and timezone
      
      const fileName = `promptbase-backup-${timestamp}.json`;
      await writeFile(path.join(backupPath, fileName), JSON.stringify(backupData, null, 2));
  
      // Keep only last 5 auto-backups
      const files = await readdir(backupPath);
      const autoBackups = files
        .filter(f => f.startsWith('promptbase-backup-'))
        .sort((a, b) => b.localeCompare(a)); // Sort in descending order
      
      if (autoBackups.length > 5) {
        // Delete older backups
        for (const file of autoBackups.slice(5)) {
          await unlink(path.join(backupPath, file));
        }
      }
    } catch (error) {
      console.error('Auto-backup failed:', error);
    }
  }

  static async migrateData() {
    try {
      const oldData = await LocalStorage.getItem<string>(this.OLD_KEY);
      if (oldData) {
        await LocalStorage.setItem(this.NEW_KEY, oldData);
        return true;
      }
    } catch (error) {
      console.error("Migration failed:", error);
    }
    return false;
  }

  static async getPrompts(): Promise<Prompt[]> {
    try {
      let data = await LocalStorage.getItem<string>(this.NEW_KEY);
      
      if (!data) {
        const migrated = await this.migrateData();
        if (migrated) {
          data = await LocalStorage.getItem<string>(this.NEW_KEY);
        }
      }
      
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Failed to get prompts:", error);
      return [];
    }
  }

  static async savePrompt(prompt: Prompt): Promise<void> {
    try {
      const prompts = await this.getPrompts();
      prompts.push(prompt);
      await LocalStorage.setItem(this.NEW_KEY, JSON.stringify(prompts));
      await this.createAutoBackup(); // Add automatic backup
    } catch (error) {
      console.error("Failed to save prompt:", error);
      throw error;
    }
  }

  static async updatePrompt(prompt: Prompt): Promise<void> {
    try {
      const prompts = await this.getPrompts();
      const index = prompts.findIndex(p => p.id === prompt.id);
      if (index !== -1) {
        prompts[index] = prompt;
        await LocalStorage.setItem(this.NEW_KEY, JSON.stringify(prompts));
        await this.createAutoBackup(); // Add automatic backup
      }
    } catch (error) {
      console.error("Failed to update prompt:", error);
      throw error;
    }
  }

  static async deletePrompt(id: string): Promise<void> {
    try {
      const prompts = await this.getPrompts();
      const filtered = prompts.filter(p => p.id !== id);
      await LocalStorage.setItem(this.NEW_KEY, JSON.stringify(filtered));
      await this.createAutoBackup(); // Add automatic backup
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      throw error;
    }
  }

  static async exportPrompts(): Promise<string> {
    try {
      const prompts = await this.getPrompts();
      const exportData: ExportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        prompts
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("Failed to export prompts:", error);
      throw error;
    }
  }

  static async importPrompts(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData) as ExportData;
      
      if (!data.prompts || !Array.isArray(data.prompts)) {
        throw new Error("Invalid data structure");
      }
      
      const validPrompts = data.prompts.every(prompt => 
        typeof prompt.id === 'string' &&
        typeof prompt.title === 'string' &&
        typeof prompt.content === 'string' &&
        typeof prompt.category === 'string' &&
        Array.isArray(prompt.tags)
      );

      if (!validPrompts) throw new Error("Invalid prompt data");

      await LocalStorage.setItem(this.NEW_KEY, JSON.stringify(data.prompts));
      await this.createAutoBackup(); // Add automatic backup after import
      return true;
    } catch (error) {
      console.error("Failed to import prompts:", error);
      return false;
    }
  }

  static async getBackups(): Promise<string[]> {
    try {
      const backupPath = path.join(environment.supportPath, 'backups');
      const files = await readdir(backupPath);
      return files.filter(f => f.endsWith('.json')).sort().reverse();
    } catch (error) {
      console.error("Failed to get backups:", error);
      return [];
    }
  }
}