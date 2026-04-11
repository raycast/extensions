import { homedir } from "os";
import { readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { AWS_AUTH_SCRIPT_PATH } from "../constants";

export interface MfaCredentials {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_SESSION_TOKEN: string;
  AWS_DEFAULT_REGION: string;
  AWS_EXPIRATION: string;
  AWS_ACCOUNT_ID?: string;
  AWS_ACCOUNT_NAME?: string;
  AWS_ROLE_NAME?: string;
}

export interface CredentialsFile {
  [key: string]: MfaCredentials;
}

export const ROLES = [
  { id: "main", name: "Main Account", account: "010788285346", accountName: "Purpose Advisor Solutions" },
  { id: "developer-npn", name: "Developer NonProd", account: "865045593529", accountName: "NonProd_PAS" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export async function runAwsAuth(roleId: RoleId): Promise<void> {
  await promisify(exec)(`"${AWS_AUTH_SCRIPT_PATH}" "${roleId}"`);
}

export function getAuthErrorMessage(error: unknown): string {
  const e = error as { stderr?: string; message?: string };
  return e.stderr || e.message || "Unknown error";
}

const CREDENTIALS_PATH = `${homedir()}/.aws/raycast-credentials.json`;

async function readAllCredentials(): Promise<CredentialsFile | null> {
  try {
    const content = await readFile(CREDENTIALS_PATH, "utf8");
    return JSON.parse(content) as CredentialsFile;
  } catch {
    return null;
  }
}

function isExpired(expiration: string): boolean {
  const expirationDate = new Date(expiration);
  return expirationDate.getTime() <= Date.now();
}

function getTimeRemaining(expiration: string): string {
  const expirationDate = new Date(expiration);
  const diff = expirationDate.getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function injectCredentials(credentials: MfaCredentials) {
  process.env.AWS_ACCESS_KEY_ID = credentials.AWS_ACCESS_KEY_ID;
  process.env.AWS_SECRET_ACCESS_KEY = credentials.AWS_SECRET_ACCESS_KEY;
  process.env.AWS_SESSION_TOKEN = credentials.AWS_SESSION_TOKEN;
  process.env.AWS_REGION = credentials.AWS_DEFAULT_REGION;
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_VAULT;
}

export function clearCredentials() {
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.AWS_SESSION_TOKEN;
}

export function useMfaSession(roleId?: RoleId) {
  const [activeRole, setActiveRole] = useCachedState<RoleId>("aws-active-role", "main");
  const currentRole = roleId ?? activeRole;

  const {
    data: allCredentials,
    isLoading,
    revalidate,
  } = useCachedPromise(readAllCredentials, [], {
    keepPreviousData: false,
  });

  const credentials = allCredentials?.[currentRole] ?? null;
  const hasCredentials = !!credentials;
  const expired = credentials ? isExpired(credentials.AWS_EXPIRATION) : true;
  const timeRemaining = credentials ? getTimeRemaining(credentials.AWS_EXPIRATION) : "";

  // Get status for all roles
  const roleStatuses = ROLES.map((role) => {
    const creds = allCredentials?.[role.id];
    const valid = creds && !isExpired(creds.AWS_EXPIRATION);
    return {
      ...role,
      credentials: creds,
      isValid: valid,
      timeRemaining: creds ? getTimeRemaining(creds.AWS_EXPIRATION) : "",
    };
  });

  // Inject credentials only if valid, otherwise clear them
  if (credentials && !expired) {
    injectCredentials(credentials);
  } else {
    clearCredentials();
  }

  // Safe setter that only allows switching to valid sessions
  const setActiveRoleSafe = (newRole: RoleId): boolean => {
    const roleStatus = roleStatuses.find((r) => r.id === newRole);
    if (roleStatus && !roleStatus.isValid) {
      return false; // Reject - session is expired
    }
    setActiveRole(newRole);
    return true;
  };

  return {
    credentials,
    allCredentials,
    isLoading,
    hasCredentials,
    isValid: hasCredentials && !expired,
    expired,
    timeRemaining,
    revalidate,
    activeRole: currentRole,
    setActiveRole: setActiveRoleSafe,
    roleStatuses,
  };
}
