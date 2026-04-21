/**
 * IAM Service - Provides efficient access to Google Cloud IAM functionality
 * Uses REST APIs for improved performance (no CLI subprocess overhead)
 */

import { getRoleInfo as getGCPRoleInfo, formatRoleName as formatGCPRoleName } from "../../utils/iamRoles";
import {
  getProjectIamPolicy,
  listServiceAccounts as apiListServiceAccounts,
  listIamRoles as apiListIamRoles,
  getBucketIamPolicy,
  gcpPost,
  CRM_API,
  type IamPolicy as ApiIamPolicy,
  type ServiceAccount as ApiServiceAccount,
  type IamRole as ApiIamRole,
} from "../../utils/gcpApi";

interface GCPRole {
  name: string;
  title?: string;
  description?: string;
  includedPermissions?: string[];
  stage?: string;
  etag?: string;
}

export interface IAMPrincipal {
  type: string;
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

export class IAMService {
  private gcloudPath: string;
  private projectId: string;
  private policyCache: Map<string, { policy: IAMPolicy; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000;

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Convert API policy to internal format
   */
  private convertPolicy(apiPolicy: ApiIamPolicy): IAMPolicy {
    return {
      version: apiPolicy.version,
      etag: apiPolicy.etag,
      bindings: (apiPolicy.bindings || []).map((b) => ({
        role: b.role,
        members: b.members,
        condition: b.condition as IAMCondition,
      })),
    };
  }

  async getIAMPolicy(resourceType?: string, resourceName?: string): Promise<IAMPolicy> {
    const cacheKey = resourceType && resourceName ? `${resourceType}:${resourceName}` : `project:${this.projectId}`;

    const cachedPolicy = this.policyCache.get(cacheKey);
    const now = Date.now();

    if (cachedPolicy && now - cachedPolicy.timestamp < this.CACHE_TTL) {
      return cachedPolicy.policy;
    }

    let apiPolicy: ApiIamPolicy;

    if (resourceType === "storage" && resourceName) {
      // Use REST API for bucket IAM
      const bucketPolicy = await getBucketIamPolicy(this.gcloudPath, resourceName);
      apiPolicy = {
        version: 1,
        etag: bucketPolicy.etag || "",
        bindings: bucketPolicy.bindings,
      };
    } else {
      // Use REST API for project IAM policy
      apiPolicy = await getProjectIamPolicy(this.gcloudPath, this.projectId);
    }

    if (!apiPolicy.bindings || !Array.isArray(apiPolicy.bindings)) {
      // Return empty policy if no bindings
      const emptyPolicy: IAMPolicy = { version: 1, etag: "", bindings: [] };
      this.policyCache.set(cacheKey, { policy: emptyPolicy, timestamp: now });
      return emptyPolicy;
    }

    const policy = this.convertPolicy(apiPolicy);
    this.policyCache.set(cacheKey, { policy, timestamp: now });

    return policy;
  }

  async getIAMPrincipals(resourceType?: string, resourceName?: string): Promise<IAMPrincipal[]> {
    const policy = await this.getIAMPolicy(resourceType, resourceName);

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

        const principal = principalsMap.get(principalKey)!;

        const roleInfo = this.getRoleInfo(binding.role);

        principal.roles.push({
          role: binding.role,
          title: roleInfo.title,
          description: roleInfo.description,
          condition: binding.condition,
        });
      }
    }

    const principalsArray = Array.from(principalsMap.values());
    principalsArray.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.id.localeCompare(b.id);
    });

    return principalsArray;
  }

  private async modifyPolicy(
    resourceType: string | undefined,
    resourceName: string | undefined,
    modifier: (policy: IAMPolicy) => void,
  ): Promise<void> {
    try {
      const policy = await this.getIAMPolicy(resourceType, resourceName);
      modifier(policy);
      const url = `${CRM_API}/projects/${this.projectId}:setIamPolicy`;
      await gcpPost(this.gcloudPath, url, { policy });
      const cacheKey = resourceType && resourceName ? `${resourceType}:${resourceName}` : `project:${this.projectId}`;
      this.policyCache.delete(cacheKey);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isPermissionDenied =
        errorMessage.toLowerCase().includes("permission denied") || errorMessage.includes("403");
      throw new Error(
        isPermissionDenied
          ? "Permission denied: Policy update access denied. You need 'resourcemanager.projects.setIamPolicy' permission (typically Project Owner role)."
          : errorMessage,
      );
    }
  }

  async addMember(
    role: string,
    memberType: string,
    memberId: string,
    resourceType?: string,
    resourceName?: string,
  ): Promise<void> {
    if (!this.validateMemberId(memberType, memberId)) {
      throw new Error(`Invalid member ID format for ${memberType}`);
    }

    const member = `${memberType}:${memberId}`;
    await this.modifyPolicy(resourceType, resourceName, (policy) => {
      const existing = policy.bindings.find((b) => b.role === role);
      if (existing) {
        if (!existing.members.includes(member)) {
          existing.members.push(member);
        }
      } else {
        policy.bindings.push({ role, members: [member] });
      }
    });
  }

  async removeMember(
    role: string,
    memberType: string,
    memberId: string,
    resourceType?: string,
    resourceName?: string,
  ): Promise<void> {
    if (!this.validateMemberId(memberType, memberId)) {
      throw new Error(`Invalid member ID format for ${memberType}`);
    }

    const member = `${memberType}:${memberId}`;
    await this.modifyPolicy(resourceType, resourceName, (policy) => {
      for (const binding of policy.bindings) {
        if (binding.role === role) {
          binding.members = binding.members.filter((m) => m !== member);
          break;
        }
      }
      policy.bindings = policy.bindings.filter((b) => b.members.length > 0);
    });
  }

  async getServiceAccounts(): Promise<IAMServiceAccount[]> {
    // Use REST API instead of gcloud CLI
    const serviceAccounts = await apiListServiceAccounts(this.gcloudPath, this.projectId);

    return serviceAccounts.map((sa: ApiServiceAccount) => ({
      name: sa.name,
      email: sa.email,
      displayName: sa.displayName || sa.email.split("@")[0],
      description: sa.description,
      disabled: sa.disabled || false,
    }));
  }

  async getCustomRoles(): Promise<IAMCustomRole[]> {
    // Use REST API instead of gcloud CLI
    const roles = await apiListIamRoles(this.gcloudPath);

    return roles.map((role: ApiIamRole) => ({
      name: role.name,
      title: role.title || this.formatRoleName(role.name),
      description: role.description || "",
      permissions: role.includedPermissions || [],
      stage: role.stage || "GA",
      etag: role.etag || "",
    }));
  }

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

  getRoleInfo(role: string): { title: string; description: string } {
    const roleInfo = getGCPRoleInfo(role);

    return {
      title: roleInfo.title || formatGCPRoleName(role),
      description: roleInfo.description || "",
    };
  }

  formatRoleName(role: string): string {
    return formatGCPRoleName(role);
  }

  validateMemberId(type: string, id: string): boolean {
    switch (type) {
      case "user":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "serviceAccount":
        return (
          /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(id) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)
        );
      case "group":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case "domain":
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(id);
      case "allUsers":
      case "allAuthenticatedUsers":
      case "projectEditor":
      case "projectOwner":
      case "projectViewer":
        return true;
      default:
        return id.trim() !== "";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createGroup(groupId: string, displayName?: string, description?: string): Promise<Record<string, unknown>> {
    throw new Error("Group creation requires Cloud Identity API - not implemented");
  }

  async getRoleSuggestions(query: string): Promise<IAMRole[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      // Use REST API to list roles
      const allRoles = await apiListIamRoles(this.gcloudPath);

      const filteredRoles = allRoles.filter((role: GCPRole) => {
        const roleId = role.name.split("/").pop() || "";
        return (
          roleId.toLowerCase().includes(query.toLowerCase()) ||
          (role.title && role.title.toLowerCase().includes(query.toLowerCase())) ||
          (role.description && role.description.toLowerCase().includes(query.toLowerCase()))
        );
      });

      return filteredRoles.map((role: GCPRole) => ({
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
