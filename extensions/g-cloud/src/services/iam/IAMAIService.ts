import { AI } from "@raycast/api";
import { IAMService, IAMPrincipal } from "./IAMService";
import { getRoleInfo } from "../../utils/iamRoles";

export class IAMAIService {
  private iamService: IAMService;
  private cachedPrincipals: Map<string, { principals: IAMPrincipal[]; timestamp: number }> = new Map();
  private projectId: string;
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL

  constructor(iamService: IAMService, projectId: string) {
    this.iamService = iamService;
    this.projectId = projectId;
  }

  private async refreshIAMData(): Promise<IAMPrincipal[]> {
    try {
      const principals = await this.iamService.getIAMPrincipals();
      this.cachedPrincipals.set(this.projectId, {
        principals,
        timestamp: Date.now(),
      });
      return principals;
    } catch (error) {
      console.error("Failed to fetch IAM principals:", error);
      throw error;
    }
  }

  private isCacheValid(): boolean {
    const cached = this.cachedPrincipals.get(this.projectId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_TTL;
  }

  private async getIAMPrincipals(): Promise<IAMPrincipal[]> {
    if (!this.isCacheValid()) {
      return this.refreshIAMData();
    }
    return this.cachedPrincipals.get(this.projectId)?.principals || [];
  }

  async handleQuery(query: string): Promise<string> {
    try {
      // Always try to get fresh IAM data first
      const principals = await this.getIAMPrincipals();

      // For questions about principals, provide a direct answer
      if (query.toLowerCase().includes("principal") || query.toLowerCase().includes("whom")) {
        if (principals.length === 0) {
          return (
            `No IAM principals found in project ${this.projectId}. This could mean either:\n\n` +
            "1. There are no IAM bindings configured\n" +
            "2. You may not have sufficient permissions to view IAM bindings\n" +
            "3. There might be an issue fetching the IAM policy\n\n" +
            "Please verify your permissions and try again."
          );
        }

        let response = `Here are the IAM principals in project ${this.projectId}:\n\n`;
        principals.forEach((principal) => {
          response += `### ${principal.type}: ${principal.id}\n`;
          if (principal.roles.length === 0) {
            response += "- No roles assigned\n";
          } else {
            response += "Roles:\n";
            principal.roles.forEach((role) => {
              const roleInfo = getRoleInfo(role.role);
              response += `- ${role.role} (${roleInfo.title}): ${roleInfo.description}\n`;
            });
          }
          response += "\n";
        });
        return response;
      }

      // Use AI to interpret the query and generate a response
      const aiQuery = `You are an AI assistant helping with Google Cloud IAM management.
                      You have access to the current IAM state for project: ${this.projectId}
                      The following data was just fetched from the project:
                      ${this.prepareDetailedContext(principals)}
                      
                      When answering questions:
                      1. Always use the freshly fetched information from the context
                      2. Be specific about roles, permissions, and principals that exist in the project
                      3. If something isn't in the context, clearly state that it's not found in the current configuration
                      4. Include relevant role IDs and descriptions when discussing permissions
                      5. Always reference the project ID when discussing configurations
                      
                      Format your responses in markdown.
                      
                      Question: ${query}`;

      const response = await AI.ask(aiQuery, {
        model: AI.Model["OpenAI_GPT4o-mini"],
        creativity: "low", // Use low creativity to stick to facts
      });

      return response;
    } catch (error) {
      console.error("Error handling IAM query:", error);
      return (
        `Error accessing IAM information for project ${this.projectId}:\n\n` +
        `${error instanceof Error ? error.message : "Unknown error"}\n\n` +
        "Please verify your permissions and try again."
      );
    }
  }

  private prepareDetailedContext(principals: IAMPrincipal[]): string {
    let context = `Current IAM State for project ${this.projectId} (fetched at ${new Date().toISOString()}):\n\n`;

    if (principals.length === 0) {
      context += "No principals found in the current project context.\n\n";
      return context;
    }

    // Group principals by type for better organization
    const principalsByType = principals.reduce(
      (acc, principal) => {
        if (!acc[principal.type]) {
          acc[principal.type] = [];
        }
        acc[principal.type].push(principal);
        return acc;
      },
      {} as Record<string, IAMPrincipal[]>,
    );

    // Add organized information about principals
    Object.entries(principalsByType).forEach(([type, typePrincipals]) => {
      context += `## ${type} Principals (${typePrincipals.length}):\n\n`;
      typePrincipals.forEach((principal) => {
        context += `### ${principal.id}\n`;
        if (principal.roles.length === 0) {
          context += "- No roles assigned\n";
        } else {
          context += "Assigned Roles:\n";
          principal.roles.forEach((role) => {
            const roleInfo = getRoleInfo(role.role);
            context += `- Role: ${role.role}\n`;
            context += `  Title: ${roleInfo.title}\n`;
            context += `  Description: ${roleInfo.description}\n`;
            if (role.condition) {
              context += `  Condition: ${role.condition.title}\n`;
              context += `  Expression: ${role.condition.expression}\n`;
            }
          });
        }
        context += "\n";
      });
    });

    return context;
  }

  async suggestRoles(principal: IAMPrincipal): Promise<string[]> {
    try {
      // Ensure we have fresh data
      await this.getIAMPrincipals();

      const aiQuery = `You are a GCP IAM expert. Suggest additional roles that would complement the principal's current roles for project ${this.projectId}.
                      Consider common role combinations and best practices.
                      Return ONLY a comma-separated list of role IDs (e.g. roles/viewer,roles/editor).
                      Do not include roles the principal already has.
                      
                      Current roles: ${principal.roles.map((r) => r.role).join(", ")}`;

      const response = await AI.ask(aiQuery, {
        model: AI.Model["OpenAI_GPT4o-mini"],
        creativity: "low",
      });

      return response
        .split(",")
        .map((role) => role.trim())
        .filter((role) => !principal.roles.some((r) => r.role === role));
    } catch (error) {
      console.error("Error suggesting roles:", error);
      return [];
    }
  }

  async explainRoleAccess(roleId: string): Promise<string> {
    try {
      // Ensure we have fresh data
      const principals = await this.getIAMPrincipals();
      const roleInfo = getRoleInfo(roleId);

      // Find principals that have this role
      const principalsWithRole = principals.filter((p) => p.roles.some((r) => r.role === roleId));

      const aiQuery = `You are a GCP IAM expert. Explain the role's permissions and current usage in project ${this.projectId}.
                      Format your response in markdown.
                      Include:
                      1. A brief overview of the role
                      2. Key permissions granted
                      3. Current usage in the project (${principalsWithRole.length} principals have this role)
                      4. Any important limitations or security considerations
                      
                      Role info:
                      Title: ${roleInfo.title}
                      Description: ${roleInfo.description}
                      Current assignments: ${principalsWithRole.map((p) => p.id).join(", ") || "No current assignments"}
                      
                      Explain the role "${roleId}":`;

      const response = await AI.ask(aiQuery, {
        model: AI.Model["OpenAI_GPT4o-mini"],
        creativity: "none",
      });

      return response;
    } catch (error) {
      console.error("Error explaining role access:", error);
      return (
        `Error generating explanation for role "${roleId}" in project ${this.projectId}. ` +
        `Here's what I know from the role info:\n\n` +
        `**Title**: ${getRoleInfo(roleId).title}\n` +
        `**Description**: ${getRoleInfo(roleId).description}`
      );
    }
  }
}
