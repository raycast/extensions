import { homedir } from "os";
import { join } from "path";
import { ConnectionProfile } from "../types";

interface AWSConfigSection {
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  region?: string;
  endpoint_url?: string;
  output?: string;
}

interface AWSCredentialsSection {
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  aws_session_token?: string;
}

export class AWSConfigReader {
  private static CONFIG_PATH = join(homedir(), ".aws", "config");
  private static CREDENTIALS_PATH = join(homedir(), ".aws", "credentials");

  static async readAWSProfiles(): Promise<ConnectionProfile[]> {
    const profiles: ConnectionProfile[] = [];

    try {
      const [configProfiles, credentialProfiles] = await Promise.all([
        this.parseConfigFile(this.CONFIG_PATH),
        this.parseCredentialsFile(this.CREDENTIALS_PATH),
      ]);

      // Merge config and credentials
      const allProfileNames = new Set([...Object.keys(configProfiles), ...Object.keys(credentialProfiles)]);

      for (const profileName of allProfileNames) {
        const config = configProfiles[profileName] || {};
        const credentials = credentialProfiles[profileName] || {};

        // Skip profiles without credentials
        if (!credentials.aws_access_key_id || !credentials.aws_secret_access_key) {
          continue;
        }

        const profile: ConnectionProfile = {
          id: `aws_${profileName}`,
          name: profileName === "default" ? "AWS Default Profile" : `AWS ${profileName}`,
          provider: "aws",
          region: config.region || credentials.region || "us-east-1",
          accessKeyId: credentials.aws_access_key_id,
          secretAccessKey: credentials.aws_secret_access_key,
          sessionToken: credentials.aws_session_token,
          endpoint: config.endpoint_url,
          isDefault: profileName === "default",
        };

        profiles.push(profile);
      }
    } catch (error) {
      console.error("Failed to read AWS config:", error);
      // Don't throw error, just return empty array so app continues to work
    }

    return profiles;
  }

  private static async parseConfigFile(filePath: string): Promise<Record<string, AWSConfigSection>> {
    try {
      // Import fs dynamically to avoid issues in Raycast environment
      const fs = await import("fs");
      const content = await fs.promises.readFile(filePath, "utf-8");
      return this.parseINIFile<AWSConfigSection>(content, true);
    } catch {
      // File doesn't exist or can't be read
      return {};
    }
  }

  private static async parseCredentialsFile(filePath: string): Promise<Record<string, AWSCredentialsSection>> {
    try {
      const fs = await import("fs");
      const content = await fs.promises.readFile(filePath, "utf-8");
      return this.parseINIFile<AWSCredentialsSection>(content, false);
    } catch {
      return {};
    }
  }

  private static parseINIFile<T extends AWSConfigSection | AWSCredentialsSection>(
    content: string,
    isConfigFile: boolean,
  ): Record<string, T> {
    const sections: Record<string, T> = {};
    let currentSection = "";

    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#") || trimmedLine.startsWith(";")) {
        continue;
      }

      // Check for section header
      const sectionMatch = trimmedLine.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        let sectionName = sectionMatch[1];

        // Handle profile sections in config file
        if (isConfigFile && sectionName.startsWith("profile ")) {
          sectionName = sectionName.replace("profile ", "");
        }

        currentSection = sectionName;
        sections[currentSection] = sections[currentSection] || ({} as T);
        continue;
      }

      // Parse key-value pairs
      const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim().replace(/^["']|["']$/g, ""); // Remove quotes
        (sections[currentSection] as Record<string, string | undefined>)[key] = value;
      }
    }

    return sections;
  }

  static async checkAWSConfigExists(): Promise<boolean> {
    try {
      const fs = await import("fs");
      const [configExists, credentialsExists] = await Promise.all([
        fs.promises
          .access(this.CONFIG_PATH)
          .then(() => true)
          .catch(() => false),
        fs.promises
          .access(this.CREDENTIALS_PATH)
          .then(() => true)
          .catch(() => false),
      ]);

      return configExists || credentialsExists;
    } catch {
      return false;
    }
  }
}
