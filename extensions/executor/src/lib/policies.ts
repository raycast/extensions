import type { Connection, Owner, SpecNumber } from "./types";

export type PolicyAction = "approve" | "require_approval" | "block";

export interface Policy {
  id: string;
  owner: Owner;
  pattern: string;
  action: PolicyAction;
  position: string;
  createdAt: SpecNumber;
  updatedAt: SpecNumber;
}

export const POLICY_ACTION_LABEL: Record<PolicyAction, string> = {
  approve: "Always Run",
  require_approval: "Require Approval",
  block: "Block",
};

// Executor uses the state form in badges and the verb form in action menus.
export const POLICY_STATE_LABEL: Record<PolicyAction, string> = {
  ...POLICY_ACTION_LABEL,
  block: "Blocked",
};

export const POLICY_ACTION_DESCRIPTION: Record<PolicyAction, string> = {
  approve: "Run matching tools without asking for approval.",
  require_approval: "Ask for approval before running matching tools.",
  block: "Prevent matching tools from being available to agents.",
};

/** Guided choices keep the selected target exact; only integration choices add a subtree wildcard. */
export function exactPolicyPattern(address: string): string {
  const pattern = address.replace(/^tools\./, "");
  if (validatePolicyPattern(pattern) || pattern.includes("*")) throw new Error("Choose an exact tool address.");
  return pattern;
}

export function integrationPolicyPattern(slug: string): string {
  if (!slug || slug.split(".").some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))) {
    throw new Error("Choose an integration from the catalog.");
  }
  return `${slug}.*`;
}

export type PolicyFilter =
  "all" | `owner:${Owner}` | `action:${PolicyAction}` | `owner-action:${Owner}:${PolicyAction}`;

export interface PolicyPresentation {
  title: string;
  providerSlug?: string;
  resource?: string;
  target: string;
  wildcard: "universal" | "subtree" | "segment" | "exact";
}

export function policyConnectionTarget(
  rawPattern: string,
): Pick<Connection, "integration" | "owner" | "name"> | undefined {
  const [integration, rawOwner, name] = rawPattern.trim().split(".");
  if (!integration || (rawOwner !== "user" && rawOwner !== "org") || !name || name === "*") return undefined;
  return { integration, owner: rawOwner, name };
}

function readableSegment(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (["api", "id", "mcp", "oauth", "url"].includes(lower)) return lower.toUpperCase();
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

const GENERIC_TOOL_NAMES = new Set(["create", "delete", "download", "get", "list", "search", "update"]);

export function policyPresentation(rawPattern: string): PolicyPresentation {
  const pattern = rawPattern.trim();
  if (pattern === "*") {
    return { title: "All Tools", target: "Every tool from every integration", wildcard: "universal" };
  }

  const segments = pattern.split(".");
  const providerSlug = segments[0];
  if (segments.at(-1) === "*") {
    const prefix = segments.slice(0, -1);
    if (prefix.length === 1) {
      const provider = readableSegment(prefix[0] ?? "");
      return {
        title: `${provider} Tools`,
        providerSlug,
        target: `Every tool provided by ${provider}`,
        wildcard: "subtree",
      };
    }
    const resource = readableSegment(prefix.at(-1) ?? "");
    return {
      title: `${resource} Tools`,
      providerSlug,
      resource,
      target: `Every tool below the ${resource} resource`,
      wildcard: "subtree",
    };
  }

  const rawTool = segments.at(-1) ?? pattern;
  const tool = readableSegment(rawTool);
  const resource = segments.length > 1 ? readableSegment(segments.at(-2) ?? "") : undefined;
  const title = resource && GENERIC_TOOL_NAMES.has(rawTool.toLowerCase()) ? `${tool} ${resource}` : tool;
  if (segments.includes("*")) {
    return {
      title,
      providerSlug,
      resource,
      target: resource ?? tool,
      wildcard: "segment",
    };
  }
  return {
    title,
    providerSlug,
    resource,
    target: resource ?? tool,
    wildcard: "exact",
  };
}

/** Mirrors Executor's accepted pattern grammar without predicting its outcome. */
export function validatePolicyPattern(rawPattern: string): string | undefined {
  const pattern = rawPattern.trim();
  if (!pattern) return "Enter a tool pattern.";
  if (pattern === "*") return undefined;
  if (pattern.startsWith(".") || pattern.endsWith(".") || pattern.includes("..")) {
    return "Use dot-separated segments without empty segments.";
  }
  if (pattern.startsWith("*")) return "Only the universal “*” pattern may start with a wildcard.";
  if (pattern.split(".").some((segment) => segment.includes("*") && segment !== "*")) {
    return "A wildcard must be a complete “*” segment.";
  }
  return undefined;
}

export function patternDescription(rawPattern: string): string {
  const pattern = rawPattern.trim();
  if (!pattern) return "Enter the exact tool address or a supported wildcard pattern.";
  if (pattern === "*") return "Broad wildcard: matches every tool in this scope.";
  if (!pattern.includes("*")) return "Applies only to this tool.";
  if (pattern.endsWith(".*")) {
    return `Broad subtree wildcard: matches ${pattern.slice(0, -2)} and every tool below it.`;
  }
  return "Segment wildcard: each “*” in the middle matches exactly one address segment.";
}

export function policyScopeLabel(owner: Owner): string {
  return owner === "org" ? "Workspace" : "Personal";
}

export function policyAudience(owner: Owner): string {
  return owner === "org" ? "Workspace (everyone in this workspace)" : "Personal (only you in this workspace)";
}

export function policySummary(input: Pick<Policy, "owner" | "pattern" | "action">): string {
  return `Policy scope: ${policyAudience(input.owner)}\nAction: ${POLICY_ACTION_LABEL[input.action]}\nPattern: ${input.pattern}\n\n${patternDescription(input.pattern)}`;
}

export function policyMatchesFilter(policy: Policy, filter: PolicyFilter): boolean {
  if (filter === "all") return true;
  const [kind, ownerOrAction, action] = filter.split(":");
  if (kind === "owner") return policy.owner === ownerOrAction;
  if (kind === "action") return policy.action === ownerOrAction;
  return policy.owner === ownerOrAction && policy.action === action;
}

export function createPolicyPayload(input: Pick<Policy, "owner" | "pattern" | "action">) {
  return { owner: input.owner, pattern: input.pattern.trim(), action: input.action };
}

export function updatePolicyPayload(policy: Policy, input: Pick<Policy, "pattern" | "action">) {
  return {
    owner: policy.owner,
    pattern: input.pattern.trim(),
    action: input.action,
  };
}
