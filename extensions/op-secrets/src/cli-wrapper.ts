import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface OnePasswordItem {
  id: string;
  title: string;
  vault: {
    name: string;
    id?: string;
  };
  category: string;
  tags?: string[];
}

export interface ItemDetail {
  id: string;
  title: string;
  vault: {
    id: string;
    name: string;
  };
  fields: Array<{
    id: string;
    label: string;
    value: string;
    type: string;
    reference?: string;
  }>;
}

export class OnePasswordCLI {
  private opPath: string = "op";

  constructor() {
    // Initial path
    this.opPath = "/opt/homebrew/bin/op";
  }

  private async findOpPath(): Promise<string> {
    const possiblePaths = [
      "/opt/homebrew/bin/op",
      "/usr/local/bin/op",
      "/usr/bin/op",
      "op",
    ];

    for (const path of possiblePaths) {
      try {
        await execAsync(`${path} --version`);
        return path;
      } catch {
        // Try next path
      }
    }

    throw new Error("1Password CLI not found");
  }

  async checkLogin(): Promise<void> {
    try {
      // First, make sure we have the right path for op
      this.opPath = await this.findOpPath();
      await execAsync(`${this.opPath} vault list --format json`);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("1Password CLI not found")
      ) {
        throw error;
      }
      // Re-throw the original error for login issues
      throw error;
    }
  }

  async listItems(tags?: string): Promise<OnePasswordItem[]> {
    let command = `${this.opPath} item list --format json`;
    if (tags) {
      command += ` --tags ${tags}`;
    }
    const { stdout } = await execAsync(command);
    return JSON.parse(stdout);
  }

  async getItemDetails(itemId: string): Promise<ItemDetail> {
    const { stdout } = await execAsync(
      `${this.opPath} item get ${itemId} --format json`,
    );
    return JSON.parse(stdout);
  }

  async readSecret(itemIdOrName: string, field: string): Promise<string> {
    try {
      // Use item get with the ID, which is more reliable
      const { stdout } = await execAsync(
        `${this.opPath} item get ${itemIdOrName} --format json`,
      );
      const itemData = JSON.parse(stdout);

      // Find the field we want
      for (const f of itemData.fields || []) {
        if (
          f.label === field ||
          f.id === field ||
          f.label?.toLowerCase() === field.toLowerCase()
        ) {
          return f.value;
        }
      }

      throw new Error(`Field "${field}" not found in item`);
    } catch (error) {
      throw new Error(
        `Failed to read secret: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Simplified version that just gets any credential field
  async readApiKey(itemId: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `${this.opPath} item get ${itemId} --format json`,
      );
      const item = JSON.parse(stdout);

      // Look for common credential field names
      const credentialFieldNames = [
        "credentials",
        "credential",
        "api key",
        "apikey",
        "key",
        "secret",
        "token",
        "password",
      ];

      for (const field of item.fields || []) {
        const fieldLabel = field.label?.toLowerCase() || "";
        const fieldId = field.id?.toLowerCase() || "";

        if (
          credentialFieldNames.some(
            (name) => fieldLabel.includes(name) || fieldId.includes(name),
          )
        ) {
          return field.value;
        }
      }

      // If no specific credential field found, try the first concealed field
      const concealedField = item.fields?.find(
        (f: any) => f.type === "CONCEALED",
      );
      if (concealedField) {
        return concealedField.value;
      }

      // Don't just return any field with a value - throw an error instead
      throw new Error(
        `No credential field found in item. Available fields: ${item.fields?.map((f: any) => f.label).join(", ")}`,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("No credential field found")
      ) {
        throw error;
      }
      throw new Error(
        `Failed to read secret: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
