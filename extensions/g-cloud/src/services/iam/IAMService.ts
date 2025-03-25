/**
 * IAM Service - Provides efficient access to Google Cloud IAM functionality
 * Optimized for performance and user experience
 */

import { executeGcloudCommand } from "../../gcloud";
import { showFailureToast } from "@raycast/utils";
import { getRoleInfo as getGCPRoleInfo, formatRoleName as formatGCPRoleName } from "../../utils/iamRoles";

interface GCPServiceAccount {
  name: string;
  email: string;
  displayName?: string;
  description?: string;
  disabled: boolean;
  oauth2ClientId?: string;
}

interface GCPRole {
  name: string;
  title?: string;
  description?: string;
  includedPermissions?: string[];
  stage?: string;
  etag?: string;
}

export interface IAMPrincipal {
  type: string; // user, group, serviceAccount, etc.
  id: string;
  email: string;
  displayName: string;
  roles: IAMRole[];
}

export interface IAMRole {
  role: string;
  title: string;
  description: string;
  condition?: IAMCondition;
}

export interface IAMCondition {
  title: string;
  description?: string;
  expression: string;
}

export interface IAMBinding {
  role: string;
  members: string[];
  condition?: IAMCondition;
}

export interface IAMPolicy {
  version: number;
  etag: string;
  bindings: IAMBinding[];
}

export interface IAMServiceAccount {
  name: string;
  email: string;
  displayName: string;
  description?: string;
  disabled: boolean;
  oauth2ClientId?: string;
}

export interface IAMCustomRole {
  name: string;
  title: string;
  description: string;
  permissions: string[];
  stage: string;
  etag: string;
}

/**
 * IAM Service class - provides optimized access to IAM functionality
 */
export class IAMService {
  private gcloudPath: string;
  private projectId: string;
  private policyCache: Map<string, { policy: IAMPolicy; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes cache TTL (increased from 30 seconds)

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Get IAM policy for a project or resource
   * Uses caching for improved performance
   */
  async getIAMPolicy(resourceType?: string, resourceName?: string): Promise<IAMPolicy> {
    const cacheKey = resourceType && resourceName ? `${resourceType}:${resourceName}` : `project:${this.projectId}`;

    const cachedPolicy = this.policyCache.get(cacheKey);
    const now = Date.now();

    // Return cached policy if it exists and is not expired
    if (cachedPolicy && now - cachedPolicy.timestamp < this.CACHE_TTL) {
      return cachedPolicy.policy;
    }

    let command = "";

    if (resourceType === "storage" && resourceName) {
      command = `storage buckets get-iam-policy gs://${resourceName} --project=${this.projectId}`;
    } else if (resourceType === "compute" && resourceName) {
      command = `compute instances get-iam-policy ${resourceName} --project=${this.projectId}`;
    } else {
      command = `projects get-iam-policy ${this.projectId}`;
    }

    try {
      const result = await executeGcloudCommand(this.gcloudPath, command);

      if (!Array.isArray(result) || result.length === 0) {
        showFailureToast({
          title: "IAM Policy Error",
          message: "No IAM policy found or empty result",
        });
        throw new Error("No IAM policy found or empty result");
      }

      const policy = Array.isArray(result) ? result[0] : result;

      if (!policy.bindings || !Array.isArray(policy.bindings)) {
        showFailureToast({
          title: "Invalid IAM Policy",
          message: "Invalid policy format: no bindings found",
        });
        throw new Error("Invalid IAM policy format: no bindings found");
      }

      // Cache the policy
      this.policyCache.set(cacheKey, { policy, timestamp: now });

      return policy;
    } catch (error: unknown) {
      console.error("Error fetching IAM policy:", error);
      showFailureToast({
        title: "Failed to Fetch IAM Policy",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get IAM principals (members) with their roles
   * Optimized for performance with caching
   */
  async getIAMPrincipals(resourceType?: string, resourceName?: string): Promise<IAMPrincipal[]> {
    try {
      const policy = await this.getIAMPolicy(resourceType, resourceName);

      // Process the bindings into a member-centric structure
      const principalsMap = new Map<string, IAMPrincipal>();

      for (const binding of policy.bindings) {
        for (const member of binding.members) {
          const [type, id] = member.includes(":") ? member.split(":", 2) : [member, ""];
          const principalKey = `${type}:${id}`;

          if (!principalsMap.has(principalKey)) {
            principalsMap.set(principalKey, {
              type,
              id,
              email: id,
              displayName: this.formatMemberType(type),
              roles: [],
            });
          }

          const principal = principalsMap.get(principalKey);
          if (!principal) {
            showFailureToast({
              title: "IAM Principal Error",
              message: `Failed to get principal for ${principalKey}`,
            });
            throw new Error(`Failed to get principal for ${principalKey} - this should never happen`);
          }

          const roleInfo = this.getRoleInfo(binding.role);

          principal.roles.push({
            role: binding.role,
            title: roleInfo.title,
            description: roleInfo.description,
            condition: binding.condition,
          });
        }
      }

      // Convert map to array and sort by type and email
      const principalsArray = Array.from(principalsMap.values());
      principalsArray.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return a.id.localeCompare(b.id);
      });

      return principalsArray;
    } catch (error: unknown) {
      console.error("Error getting IAM principals:", error);
      showFailureToast({
        title: "Failed to Get IAM Principals",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Add a member to a role
   */
  async addMember(
    role: string,
    memberType: string,
    memberId: string,
    resourceType?: string,
    resourceName?: string,
  ): Promise<void> {
    // Validate the member ID format
    if (!this.validateMemberId(memberType, memberId)) {
      showFailureToast({
        title: "Invalid Member ID",
        message: `Invalid format for ${memberType}: ${memberId}`,
      });
      throw new Error(`Invalid member ID format for ${memberType}`);
    }

    let command = "";

    if (resourceType === "storage" && resourceName) {
      command = `storage buckets add-iam-policy-binding gs://${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else if (resourceType === "compute" && resourceName) {
      command = `compute instances add-iam-policy-binding ${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else {
      command = `projects add-iam-policy-binding ${this.projectId} --member=${memberType}:${memberId} --role=${role}`;
    }

    try {
      await executeGcloudCommand(this.gcloudPath, command);

      // Invalidate cache
      const cacheKey = resourceType && resourceName ? `${resourceType}:${resourceName}` : `project:${this.projectId}`;
      this.policyCache.delete(cacheKey);
    } catch (error: unknown) {
      console.error("Error adding member:", error);
      showFailureToast({
        title: "Failed to Add Member",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Remove a member from a role
   */
  async removeMember(
    role: string,
    memberType: string,
    memberId: string,
    resourceType?: string,
    resourceName?: string,
  ): Promise<void> {
    // Validate the member ID format
    if (!this.validateMemberId(memberType, memberId)) {
      showFailureToast({
        title: "Invalid Member ID",
        message: `Invalid format for ${memberType}: ${memberId}`,
      });
      throw new Error(`Invalid member ID format for ${memberType}`);
    }

    let command = "";

    if (resourceType === "storage" && resourceName) {
      command = `storage buckets remove-iam-policy-binding gs://${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else if (resourceType === "compute" && resourceName) {
      command = `compute instances remove-iam-policy-binding ${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else {
      command = `projects remove-iam-policy-binding ${this.projectId} --member=${memberType}:${memberId} --role=${role}`;
    }

    try {
      await executeGcloudCommand(this.gcloudPath, command);

      // Invalidate cache
      const cacheKey = resourceType && resourceName ? `${resourceType}:${resourceName}` : `project:${this.projectId}`;
      this.policyCache.delete(cacheKey);
    } catch (error: unknown) {
      console.error("Error removing member:", error);
      showFailureToast({
        title: "Failed to Remove Member",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get service accounts for the project
   */
  async getServiceAccounts(): Promise<IAMServiceAccount[]> {
    try {
      const command = `iam service-accounts list --project=${this.projectId}`;
      const result = await executeGcloudCommand(this.gcloudPath, command);

      if (!Array.isArray(result)) {
        showFailureToast({
          title: "Invalid Response",
          message: "Expected array of service accounts",
        });
        throw new Error("Invalid response format: expected array of service accounts");
      }

      return result.map((sa: GCPServiceAccount) => ({
        name: sa.name,
        email: sa.email,
        displayName: sa.displayName || sa.email.split("@")[0],
        description: sa.description,
        disabled: sa.disabled || false,
        oauth2ClientId: sa.oauth2ClientId,
      }));
    } catch (error: unknown) {
      console.error("Error getting service accounts:", error);
      showFailureToast({
        title: "Failed to Get Service Accounts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get custom roles for the project
   */
  async getCustomRoles(): Promise<IAMCustomRole[]> {
    try {
      const command = `iam roles list --project=${this.projectId}`;
      const result = await executeGcloudCommand(this.gcloudPath, command);

      if (!Array.isArray(result)) {
        return [];
      }

      return result.map((role: GCPRole) => ({
        name: role.name,
        title: role.title || this.formatRoleName(role.name),
        description: role.description || "",
        permissions: role.includedPermissions || [],
        stage: role.stage || "GA",
        etag: role.etag || "",
      }));
    } catch (error: unknown) {
      console.error("Error getting custom roles:", error);
      showFailureToast({
        title: "Failed to Get Custom Roles",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Format a member type for display
   */
  formatMemberType(type: string): string {
    switch (type) {
      case "user":
        return "User";
      case "group":
        return "Group";
      case "serviceAccount":
        return "Service Account";
      case "domain":
        return "Domain";
      case "allUsers":
        return "All Users (Public)";
      case "allAuthenticatedUsers":
        return "All Authenticated Users";
      case "projectEditor":
        return "Project Editor";
      case "projectOwner":
        return "Project Owner";
      case "projectViewer":
        return "Project Viewer";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  /**
   * Get information about a role
   */
  getRoleInfo(role: string): { title: string; description: string } {
    const roleInfo = getGCPRoleInfo(role);

    return {
      title: roleInfo.title || formatGCPRoleName(role),
      description: roleInfo.description || "",
    };
  }

  /**
   * Format a role name for display
   */
  formatRoleName(role: string): string {
    return formatGCPRoleName(role);
  }

  /**
   * Validate a member ID format based on type
   */
  validateMemberId(type: string, id: string): boolean {
    switch (type) {
      case "user":
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "serviceAccount":
        // Service account email validation
        return (
          /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(id) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)
        );
      case "group":
        // Group email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "domain":
        // Domain validation
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(id);
      case "allUsers":
      case "allAuthenticatedUsers":
      case "projectEditor":
      case "projectOwner":
      case "projectViewer":
        // These types don't have IDs
        return true;
      default:
        // For unknown types, just check it's not empty
        return id.trim() !== "";
    }
  }

  /**
   * Creates a new Google Cloud IAM group
   * @param groupId The ID of the group to create (e.g., my-group@example.com)
   * @param displayName Optional display name for the group
   * @param description Optional description for the group
   * @returns Promise resolving to the created group details
   */
  async createGroup(groupId: string, displayName?: string, description?: string): Promise<Record<string, unknown>> {
    try {
      let command = `identity groups create ${groupId}`;

      if (displayName) {
        command += ` --display-name="${displayName}"`;
      }

      if (description) {
        command += ` --description="${description}"`;
      }

      const result = (await executeGcloudCommand(this.gcloudPath, command)) as Array<Record<string, unknown>>;
      return result[0] || {};
    } catch (error: unknown) {
      console.error("Error creating group:", error);
      showFailureToast({
        title: "Failed to Create Group",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Gets role suggestions based on a partial role name or description
   * @param query The search query for role suggestions
   * @returns Promise resolving to an array of suggested roles
   */
  async getRoleSuggestions(query: string): Promise<IAMRole[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const allRoles = (await executeGcloudCommand(this.gcloudPath, "iam roles list")) as GCPRole[];

      // Filter roles based on query
      const filteredRoles = allRoles.filter((role) => {
        const roleId = role.name.split("/").pop() || "";
        return (
          roleId.toLowerCase().includes(query.toLowerCase()) ||
          (role.title && role.title.toLowerCase().includes(query.toLowerCase())) ||
          (role.description && role.description.toLowerCase().includes(query.toLowerCase()))
        );
      });

      // Map to our IAMRole interface
      return filteredRoles.map((role) => ({
        role: role.name,
        title: role.title || role.name,
        description: role.description || "",
      }));
    } catch (error: unknown) {
      console.error("Error getting role suggestions:", error);
      return [];
    }
  }
}
