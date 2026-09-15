import {
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { linearOAuth, loadDashboard } from "./api";
import { buildDashboard, statesForIssue } from "./dashboard";
import { IssueMenu } from "./components";
import { Preferences } from "./types";

function LinearPulse() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, error, revalidate } = useCachedPromise(loadDashboard, [], {
    keepPreviousData: true,
  });

  if (error && !data) {
    return (
      <MenuBarExtra
        title="L !"
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        tooltip={error.message}
      >
        <MenuBarExtra.Item title="Linear could not refresh" subtitle={error.message} />
        <MenuBarExtra.Item title="Try Again" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
      </MenuBarExtra>
    );
  }

  if (!data) {
    return (
      <MenuBarExtra title="L …" icon={Icon.Circle} isLoading={isLoading} tooltip="Loading Linear work" />
    );
  }

  let model;
  try {
    model = buildDashboard(data, preferences);
  } catch (buildError) {
    const message = buildError instanceof Error ? buildError.message : String(buildError);
    return (
      <MenuBarExtra
        title="L !"
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        tooltip={message}
      >
        <MenuBarExtra.Item title={message} />
      </MenuBarExtra>
    );
  }

  const limit = Math.max(1, Number(preferences.menuItemLimit) || 6);
  const attentionCount = model.needsYou.length + model.reviews.length;
  const title = attentionCount ? `L ${attentionCount}` : "L ✓";
  const icon = attentionCount
    ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
    : { source: Icon.CheckCircle, tintColor: Color.Green };
  const refresh = async () => {
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "Linear refreshed" });
  };

  return (
    <MenuBarExtra
      title={title}
      icon={icon}
      isLoading={isLoading}
      tooltip={`${attentionCount} need attention · ${model.agentWork.length} agents active`}
    >
      {model.needsYou.length ? (
        <MenuBarExtra.Section title={`Needs You · ${model.needsYou.length}`}>
          {model.needsYou.slice(0, limit).map((issue) => (
            <IssueMenu
              key={issue.id}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {model.reviews.length ? (
        <MenuBarExtra.Section title={`Ready for Review · ${model.reviews.length}`}>
          {model.reviews.slice(0, limit).map((issue) => (
            <IssueMenu
              key={issue.id}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {model.agentWork.length ? (
        <MenuBarExtra.Section title={`Agents Working · ${model.agentWork.length}`}>
          {model.agentWork.slice(0, limit).map((issue) => (
            <IssueMenu
              key={issue.id}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {model.active.length ? (
        <MenuBarExtra.Section title={`Active · ${model.active.length}`}>
          {model.active.slice(0, limit).map((issue) => (
            <IssueMenu
              key={issue.id}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Work Dashboard"
          icon={Icon.List}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => launchCommand({ name: "work-dashboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
        <MenuBarExtra.Item
          title="Quick Capture"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "quick-capture", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withAccessToken(linearOAuth)(LinearPulse);
