import { createHash } from "node:crypto";
import { request } from "./client";
import { asJson } from "./format";
import { policyAudience, policySummary, validatePolicyPattern, type Policy, type PolicyAction } from "./policies";
import type { ConfirmationDetails } from "./ai-tools";
import type { Owner } from "./types";

export interface PolicyChangeInput {
  operation: "create" | "update" | "delete";
  owner: Owner;
  policyId?: string;
  policyFingerprint?: string;
  pattern?: string;
  action?: PolicyAction;
}

export function policyFingerprint(policy: Policy): string {
  return createHash("sha256")
    .update(JSON.stringify([policy.id, policy.owner, policy.pattern, policy.action, policy.position, policy.updatedAt]))
    .digest("hex");
}

export async function listAiPolicies(input: { query?: string; owner?: Owner; limit?: number; offset?: number }) {
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0)
    throw new Error("Use a limit from 1 to 100 and a non-negative integer offset.");
  if (input.owner !== undefined && !["user", "org"].includes(input.owner)) throw new Error("Invalid policy owner.");
  const query = input.query?.trim().toLowerCase();
  const policies = (await request<Policy[]>("/api/policies")).filter(
    (policy) =>
      (!input.owner || policy.owner === input.owner) &&
      (!query ||
        `${policy.pattern} ${policy.owner === "org" ? "Workspace" : "Personal"} ${policySummary(policy)}`
          .toLowerCase()
          .includes(query)),
  );
  return {
    policies: policies
      .slice(offset, offset + limit)
      .map((policy) => ({ ...policy, policyFingerprint: policyFingerprint(policy) })),
    total: policies.length,
    nextOffset: offset + limit < policies.length ? offset + limit : undefined,
  };
}

async function policyChange(input: PolicyChangeInput) {
  if (!["create", "update", "delete"].includes(input.operation)) throw new Error("Invalid policy operation.");
  if (!["user", "org"].includes(input.owner)) throw new Error("Choose Personal (user) or Workspace (org) scope.");
  let current: Policy | undefined;
  if (input.operation !== "create") {
    if (!input.policyId || !input.policyFingerprint) throw new Error("Use the ID and fingerprint from list-policies.");
    current = (await request<Policy[]>("/api/policies")).find(
      (policy) => policy.id === input.policyId && policy.owner === input.owner,
    );
    if (!current || policyFingerprint(current) !== input.policyFingerprint)
      throw new Error("The policy changed or is unavailable. Refresh list-policies and review it again.");
  } else if (input.policyId !== undefined || input.policyFingerprint !== undefined) {
    throw new Error("Do not provide an existing policy ID when creating a policy.");
  }
  if (input.operation === "delete") {
    if (input.pattern !== undefined || input.action !== undefined)
      throw new Error("Delete does not accept replacement rule fields.");
    return { current, changes: undefined };
  }
  const pattern = input.pattern ?? current?.pattern;
  const action = input.action ?? current?.action;
  if (typeof pattern !== "string") throw new Error("Provide a tool pattern.");
  const error = validatePolicyPattern(pattern);
  if (error) throw new Error(error);
  if (!action || !["approve", "require_approval", "block"].includes(action)) throw new Error("Choose a policy action.");
  return { current, changes: { owner: input.owner, pattern: pattern.trim(), action } };
}

export async function policyChangeConfirmation(input: PolicyChangeInput): Promise<ConfirmationDetails> {
  const { current, changes } = await policyChange(input);
  return {
    message:
      input.operation === "delete"
        ? "Delete this policy? Executor will recalculate behavior from the remaining rules."
        : "Save this policy? It changes which tools can run or require approval. Executor determines rule precedence.",
    info: [
      { name: "Operation", value: input.operation },
      { name: "Policy Scope", value: policyAudience(input.owner) },
      { name: "Current Policy", value: current ? asJson(current) : "New policy" },
      { name: "Proposed Rule", value: changes ? policySummary(changes) : "Remove the policy above" },
    ],
  };
}

export async function changeAiPolicy(input: PolicyChangeInput) {
  const { current, changes } = await policyChange(input);
  if (input.operation === "delete") {
    const result = await request<{ removed: boolean }>(`/api/policies/${encodeURIComponent(current!.id)}`, {
      method: "DELETE",
      body: JSON.stringify({ owner: input.owner }),
    });
    if (!result.removed) throw new Error("Executor did not remove this policy. Refresh list-policies.");
    return { removed: true, policyId: current!.id };
  }
  const policy = await request<Policy>(current ? `/api/policies/${encodeURIComponent(current.id)}` : "/api/policies", {
    method: current ? "PATCH" : "POST",
    body: JSON.stringify(changes),
  });
  return { policy: { ...policy, policyFingerprint: policyFingerprint(policy) } };
}
