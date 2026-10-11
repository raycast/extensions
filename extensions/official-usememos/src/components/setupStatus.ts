import type { CurrentUser } from "../api/auth";
import { DEFAULT_INSTANCE_URL } from "../helpers/instanceUrl";

export type Tone = "pending" | "success" | "failure" | "neutral";

export type SetupState = {
  instanceUrl: string;
  isLoading: boolean;
  user?: CurrentUser;
  errorMessage?: string;
  isTokenRejected: boolean;
};

const describeConnection = ({ isLoading, user, errorMessage }: SetupState) => {
  if (isLoading) return { title: "Checking connection…", tone: "pending" as const };
  if (errorMessage != null) return { title: "Couldn't connect", subtitle: errorMessage, tone: "failure" as const };
  if (user == null) return { title: "Not connected yet", tone: "neutral" as const };
  return {
    title: `Connected as ${user.displayName || user.username}`,
    subtitle: `@${user.username}`,
    tone: "success" as const,
  };
};

const describeToken = ({ user, isTokenRejected }: SetupState) => {
  if (isTokenRejected) return { tag: "Rejected", tone: "failure" as const };
  if (user != null) return { tag: "Accepted", tone: "success" as const };
  return { tag: "Not verified", tone: "neutral" as const };
};

export const describeSetup = (state: SetupState) => ({
  connection: describeConnection(state),
  instance: { tag: state.instanceUrl === DEFAULT_INSTANCE_URL ? "Demo" : undefined },
  token: describeToken(state),
});
