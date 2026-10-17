import { ChatProvider } from "./types";
export interface PermissionProfile {
  id: string;
  provider: ChatProvider;
  title: string;
  description: string;
  arguments: string[];
  dangerous?: boolean;
}

const codexProfiles: PermissionProfile[] = [
  {
    id: "codex-workspace-on-request",
    provider: "codex",
    title: "Workspace · On Request",
    description: "Write inside the project and request approval when needed.",
    arguments: ["--sandbox", "workspace-write", "--ask-for-approval", "on-request"],
  },
  {
    id: "codex-full-on-request",
    provider: "codex",
    title: "Full Access · On Request",
    description: "No file limits; Codex decides when to request approval.",
    arguments: ["--sandbox", "danger-full-access", "--ask-for-approval", "on-request"],
  },
  {
    id: "codex-workspace-never",
    provider: "codex",
    title: "Workspace · Never Ask",
    description: "Write inside the project and return failures without asking for approval.",
    arguments: ["--sandbox", "workspace-write", "--ask-for-approval", "never"],
  },
  {
    id: "codex-read-only",
    provider: "codex",
    title: "Read Only",
    description: "Disallow writes and escalate untrusted commands.",
    arguments: ["--sandbox", "read-only", "--ask-for-approval", "untrusted"],
  },
  {
    id: "codex-yolo",
    provider: "codex",
    title: "YOLO",
    description: "Full access with no sandbox or approvals.",
    arguments: ["--dangerously-bypass-approvals-and-sandbox"],
    dangerous: true,
  },
];

const claudeProfiles: PermissionProfile[] = [
  {
    id: "claude-default",
    provider: "claude",
    title: "Manual / Default",
    description: "Use Claude's default permission behavior.",
    arguments: [],
  },
  {
    id: "claude-accept-edits",
    provider: "claude",
    title: "Accept Edits",
    description: "Accept file changes while keeping safeguards for other actions.",
    arguments: ["--permission-mode", "acceptEdits"],
  },
  {
    id: "claude-auto",
    provider: "claude",
    title: "Auto",
    description: "Claude decides automatically based on each action's risk.",
    arguments: ["--permission-mode", "auto"],
  },
  {
    id: "claude-dont-ask",
    provider: "claude",
    title: "Don't Ask",
    description: "Do not open prompts; deny actions that were not previously allowed.",
    arguments: ["--permission-mode", "dontAsk"],
  },
  {
    id: "claude-plan",
    provider: "claude",
    title: "Plan",
    description: "Keep the session in planning mode without making changes.",
    arguments: ["--permission-mode", "plan"],
  },
  {
    id: "claude-dangerous",
    provider: "claude",
    title: "Dangerously · Bypass",
    description: "Skip all permission checks.",
    arguments: ["--dangerously-skip-permissions", "--permission-mode", "bypassPermissions"],
    dangerous: true,
  },
];

export function permissionProfiles(provider: ChatProvider): PermissionProfile[] {
  return provider === "codex" ? codexProfiles : claudeProfiles;
}

export function defaultPermissionProfile(provider: ChatProvider): PermissionProfile {
  return permissionProfiles(provider)[0];
}

export function permissionProfile(provider: ChatProvider, id?: string): PermissionProfile {
  return permissionProfiles(provider).find((profile) => profile.id === id) || defaultPermissionProfile(provider);
}
