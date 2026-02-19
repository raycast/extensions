import { ConnectionProfile } from "../types";
import { AWSConfigReader } from "./aws-config-reader";

export class ProfileManager {
  private static cachedProfiles: ConnectionProfile[] | null = null;

  static async getDefaultProfile(): Promise<ConnectionProfile | null> {
    const profiles = await this.getAllProfiles();
    return profiles.find((p) => p.isDefault) || profiles[0] || null;
  }

  static async getAllProfiles(): Promise<ConnectionProfile[]> {
    if (this.cachedProfiles) {
      return this.cachedProfiles;
    }

    try {
      // Load AWS profiles from ~/.aws config
      const awsProfiles = await AWSConfigReader.readAWSProfiles();

      // TODO: Load custom profiles from Raycast storage
      const customProfiles: ConnectionProfile[] = [];

      // Combine profiles
      this.cachedProfiles = [...awsProfiles, ...customProfiles];

      return this.cachedProfiles;
    } catch (error) {
      console.error("Failed to load profiles:", error);
      return [];
    }
  }

  static async getProfileById(profileId: string): Promise<ConnectionProfile | null> {
    const profiles = await this.getAllProfiles();
    return profiles.find((p) => p.id === profileId) || null;
  }

  static clearCache(): void {
    this.cachedProfiles = null;
  }

  static async refreshProfiles(): Promise<ConnectionProfile[]> {
    this.clearCache();
    return await this.getAllProfiles();
  }
}
