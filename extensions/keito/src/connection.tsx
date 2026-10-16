import { Action, ActionPanel, Cache, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { SetupActions } from "./components/KeitoGate";
import { errorMessage, errorTitle } from "./services/keito/errors";
import { resetLocalData } from "./services/keito/session";
import { KeitoIdentity } from "./services/keito/types";
import { getApi, getAuthConfig, getSession, refreshMenuBar, signOut, store } from "./services/useKeito";
import { keitoOAuth } from "./services/keitoOAuth";
import { primaryShortcut } from "./shortcuts";

type CheckStatus = "pass" | "fail" | "skipped";

interface Check {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
}

interface Report {
  checks: Check[];
  identity?: KeitoIdentity;
  accountChanged?: boolean;
}

function failure(id: string, title: string, error: unknown): Check {
  return { id, title, status: "fail", detail: `${errorTitle(error)}: ${errorMessage(error)}` };
}

// `run` only changes to re-trigger the checks.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function runChecks(run: number): Promise<Report> {
  const checks: Check[] = [];
  const skip = (id: string, title: string) =>
    checks.push({ id, title, status: "skipped", detail: "Fix the step above first." });

  let oauth = false;
  try {
    oauth = getAuthConfig().kind === "oauth";
    if (oauth) await keitoOAuth.getAccessToken({ interactive: true });
    checks.push({
      id: "prefs",
      title: oauth ? "Keito sign-in" : "Preferences",
      status: "pass",
      detail: oauth
        ? "Signed in with your Keito account (OAuth). Tokens are kept in Raycast's encrypted storage and refreshed automatically."
        : "Using the integration key and Company ID from the extension preferences.",
    });
  } catch (error) {
    checks.push(failure("prefs", oauth ? "Keito sign-in" : "Preferences", error));
    skip("identity", "Identity and company");
    skip("projects", "Project access");
    skip("tasks", "Task access");
    return { checks };
  }

  let identity: KeitoIdentity;
  let accountChanged = false;
  try {
    const session = await getSession({ force: true });
    identity = session.identity;
    accountChanged = session.accountChanged;
    checks.push({
      id: "identity",
      title: "Identity and company",
      status: "pass",
      detail: `${identity.name}${identity.email ? ` <${identity.email}>` : ""} · ${
        identity.companyName ?? identity.companyId
      }`,
    });
  } catch (error) {
    checks.push(failure("identity", "Identity and company", error));
    skip("projects", "Project access");
    skip("tasks", "Task access");
    return { checks };
  }

  const api = getApi();
  let firstProjectId: string | undefined;
  try {
    const projects = await api.listProjects();
    firstProjectId = projects[0]?.id;
    checks.push({
      id: "projects",
      title: "Project access",
      status: projects.length ? "pass" : "fail",
      detail: projects.length
        ? `${projects.length} active project${projects.length === 1 ? "" : "s"} assigned to you.`
        : "No active projects are assigned to you. Ask a Keito Manager or Administrator to add you to a project team.",
    });
  } catch (error) {
    checks.push(failure("projects", "Project access", error));
  }

  if (firstProjectId) {
    try {
      const tasks = await api.listProjectTasks(firstProjectId);
      checks.push({
        id: "tasks",
        title: "Task access",
        status: "pass",
        detail: tasks.length
          ? "Tasks can be read with project context."
          : "Tasks can be read, but the first project has no active tasks.",
      });
    } catch (error) {
      checks.push(failure("tasks", "Task access", error));
    }
  } else {
    skip("tasks", "Task access");
  }

  return { checks, identity, accountChanged };
}

const statusIcon: Record<CheckStatus, { source: Icon; tintColor: Color }> = {
  pass: { source: Icon.CheckCircle, tintColor: Color.Green },
  fail: { source: Icon.XMarkCircle, tintColor: Color.Red },
  skipped: { source: Icon.Circle, tintColor: Color.SecondaryText },
};

export default function Command() {
  const [run, setRun] = useState(0);
  const [signedOut, setSignedOut] = useState(false);
  const { data, isLoading, error } = usePromise(runChecks, [run], { execute: !signedOut });
  const oauth = (() => {
    try {
      return getAuthConfig().kind === "oauth";
    } catch {
      return false;
    }
  })();

  async function handleSignOut() {
    await signOut();
    new Cache().clear();
    await refreshMenuBar();
    setSignedOut(true);
    await showToast({ style: Toast.Style.Success, title: "Signed out of Keito" });
  }

  function signIn() {
    setSignedOut(false);
    setRun((n) => n + 1);
  }

  if (signedOut) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Person}
          title="Signed Out"
          description="Sign in with your Keito account to track time from Raycast."
          actions={
            <ActionPanel>
              <Action title="Sign in with Keito" icon={Icon.Person} onAction={signIn} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  const identity = data?.identity;
  const allPassed = data?.checks.every((c) => c.status === "pass");

  async function resetAndVerify() {
    const removed = await resetLocalData(store);
    new Cache().clear();
    await refreshMenuBar();
    await showToast({
      style: Toast.Style.Success,
      title: "Local Keito data cleared",
      message: `${removed} item(s) removed; favorites kept.`,
    });
    setRun((n) => n + 1);
  }

  const actions = (
    <ActionPanel>
      <Action title="Verify Connection Again" icon={Icon.ArrowClockwise} onAction={() => setRun((n) => n + 1)} />
      <SetupActions />
      {oauth && (
        <Action
          title="Sign out of Keito"
          icon={Icon.Logout}
          style={Action.Style.Destructive}
          shortcut={primaryShortcut("l", ["shift"])}
          onAction={handleSignOut}
        />
      )}
      <Action
        title="Clear Cached Keito Data"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={resetAndVerify}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} isShowingDetail={!!data}>
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorTitle(error)}
          description={errorMessage(error)}
          actions={actions}
        />
      )}
      {data && (
        <List.Section
          title={allPassed ? "Connected" : "Setup Checks"}
          subtitle={data.accountChanged ? "Credentials changed: now using a different account" : undefined}
        >
          {data.checks.map((check) => (
            <List.Item
              key={check.id}
              icon={statusIcon[check.status]}
              title={check.title}
              detail={<List.Item.Detail markdown={`## ${check.title}\n\n${check.detail}`} />}
              actions={actions}
            />
          ))}
        </List.Section>
      )}
      {identity && (
        <List.Section title="Account">
          <List.Item
            icon={Icon.Person}
            title="Account"
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Signed in as" text={identity.name} />
                    {identity.email && <List.Item.Detail.Metadata.Label title="Email" text={identity.email} />}
                    {identity.userType && (
                      <List.Item.Detail.Metadata.Label title="Identity type" text={identity.userType} />
                    )}
                    <List.Item.Detail.Metadata.Label title="Roles" text={identity.roles.join(", ") || "—"} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Company" text={identity.companyName ?? "—"} />
                    <List.Item.Detail.Metadata.Label title="Company ID" text={identity.companyId} />
                    <List.Item.Detail.Metadata.Label
                      title="Credential"
                      text={
                        identity.credentialType === "oauth" ? "Keito sign-in (OAuth)" : "Full-access integration key"
                      }
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Workspace timezone"
                      text={identity.settings.timezone ?? "Not reported (using this Mac's timezone)"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Entry format"
                      text={identity.settings.manualEntryFormat ?? "Not reported"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Notes required"
                      text={identity.settings.requireNotes ? "Yes" : "No"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Past timer starts"
                      text={
                        identity.settings.allowPastTimerStarts === undefined
                          ? "Not reported"
                          : identity.settings.allowPastTimerStarts
                            ? "Allowed"
                            : "Not allowed"
                      }
                    />
                    {identity.settings.timeRoundingDescription && (
                      <List.Item.Detail.Metadata.Label
                        title="Rounding"
                        text={identity.settings.timeRoundingDescription}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Keito features"
                      text={identity.features.join(", ") || "Not reported"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        </List.Section>
      )}
    </List>
  );
}
