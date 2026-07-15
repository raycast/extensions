import {
  Clipboard,
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getLastActivity } from "./hooks";
import { approvePlan, fetchSessionActivities, useSessions } from "./jules";
import { useSessionNotifications } from "./notification";
import { Session, SessionState } from "./types";
import {
  formatPrSubtitle,
  formatPrTitle,
  formatSessionState,
  formatSessionTitle,
  getStatusIconSimpleForSession,
  groupSessions,
} from "./utils";

function SessionMenuBarItemWithPlanSteps({ session }: { session: Session }) {
  const [planSteps, setPlanSteps] = useState<number | undefined>();

  useEffect(() => {
    async function getPlanSteps() {
      if (session.state === SessionState.PLANNING || session.state === SessionState.AWAITING_PLAN_APPROVAL) {
        try {
          const activities = await fetchSessionActivities(session.name);
          const lastActivity = getLastActivity(activities);
          const planActivity = lastActivity?.planGenerated
            ? lastActivity
            : activities.reverse().find((a) => a.planGenerated);
          setPlanSteps(planActivity?.planGenerated?.plan?.steps?.length);
        } catch (e) {
          // Silently fail, we don't want to show toasts from the menu bar item
          console.error(e);
        }
      }
    }
    getPlanSteps();
  }, [session]);

  return <SessionMenuBarItem session={session} planSteps={planSteps} />;
}

function SessionMenuBarItem({ session, planSteps }: { session: Session; planSteps?: number }) {
  const title = formatSessionTitle(session, 50);

  const prUrl = session.outputs?.find((o) => o.pullRequest)?.pullRequest?.url;

  return (
    <>
      <MenuBarExtra.Submenu
        key={session.id}
        icon={getStatusIconSimpleForSession(session)}
        title={title + (planSteps ? ` (${planSteps} steps)` : "")}
      >
        <MenuBarExtra.Item
          title={`Status: ${formatSessionState(session.state)}`}
          icon={getStatusIconSimpleForSession(session)}
        />
        {session.state === SessionState.AWAITING_PLAN_APPROVAL && (
          <MenuBarExtra.Item
            title="Approve Plan"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            onAction={async () => {
              try {
                await showToast({ style: Toast.Style.Animated, title: "Approving plan" });
                await approvePlan(session.name);
                await showToast({ style: Toast.Style.Success, title: "Plan approved" });
              } catch (e) {
                await showFailureToast(e, { title: "Failed to approve plan" });
              }
            }}
          />
        )}
        <MenuBarExtra.Item
          title="Open Session"
          icon={Icon.Globe}
          tooltip={session.prompt + (planSteps ? `\n\nPlan steps: ${planSteps}` : "")}
          onAction={async (event) => {
            switch (event.type) {
              case "left-click":
                await open(session.url);
                break;
              case "right-click":
                await Clipboard.copy(session.url);
                await showHUD("Copied URL to clipboard");
                break;
            }
          }}
        />
        {prUrl && (
          <MenuBarExtra.Item
            icon={{ source: "git-pull-request-arrow.svg", tintColor: Color.PrimaryText }}
            title={formatPrTitle(prUrl)}
            subtitle={formatPrSubtitle(prUrl)}
            onAction={async (event) => {
              switch (event.type) {
                case "left-click":
                  await open(prUrl);
                  break;
                case "right-click":
                  await Clipboard.copy(prUrl);
                  await showHUD("Copied PR URL to clipboard");
                  break;
              }
            }}
          />
        )}
      </MenuBarExtra.Submenu>
      {session.state === SessionState.AWAITING_PLAN_APPROVAL && (
        <MenuBarExtra.Item
          title={`   Approve Plan for "${title}"`}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          onAction={async () => {
            try {
              await showToast({ style: Toast.Style.Animated, title: "Approving plan" });
              await approvePlan(session.name);
              await showToast({ style: Toast.Style.Success, title: "Plan approved" });
            } catch (e) {
              await showFailureToast(e, { title: "Failed to approve plan" });
            }
          }}
        />
      )}
    </>
  );
}

export default function MenuBar() {
  const { data, isLoading } = useSessions();
  const { titleCount, statusIcon } = useSessionNotifications(data);

  const { today, yesterday, thisWeek } = groupSessions(data);

  return (
    <MenuBarExtra icon={statusIcon} title={titleCount} isLoading={isLoading}>
      {today.length > 0 && (
        <MenuBarExtra.Section title="Today">
          {today.map((session) => (
            <SessionMenuBarItemWithPlanSteps key={session.id} session={session} />
          ))}
        </MenuBarExtra.Section>
      )}

      {yesterday.length > 0 && (
        <MenuBarExtra.Section title="Yesterday">
          {yesterday.map((session) => (
            <SessionMenuBarItemWithPlanSteps key={session.id} session={session} />
          ))}
        </MenuBarExtra.Section>
      )}

      {thisWeek.length > 0 && (
        <MenuBarExtra.Section title="This Week">
          {thisWeek.map((session) => (
            <SessionMenuBarItemWithPlanSteps key={session.id} session={session} />
          ))}
        </MenuBarExtra.Section>
      )}

      {today.length === 0 && yesterday.length === 0 && thisWeek.length === 0 && !isLoading && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No recent sessions" />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={{ source: "icon.svg", tintColor: Color.PrimaryText }}
          title="View All Sessions"
          onAction={async () => {
            try {
              await launchCommand({ name: "list-sessions", type: LaunchType.UserInitiated });
            } catch (e) {
              showFailureToast(e, { title: "Failed to launch list sessions command" });
            }
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Dashboard"
          onAction={() => open("https://jules.google.com/sessions")}
        />
        <MenuBarExtra.Item icon={Icon.Gear} title="Configure Command" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
