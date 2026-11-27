import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { LookGrid } from "./components/card-views";
import { RepositoryList } from "./components/repository-list";
import { SetupForm, useSetupStatus } from "./components/setup-form";
import { github } from "./lib/github";
import { workflowRunUrl } from "./lib/setup";

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days < 1 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/** Where glancecard stands on your GitHub, and the way to set it up or change it. */
function SetUpGlancecard() {
  const { data: status, isLoading, error, revalidate } = useSetupStatus();
  // With a workflow, a change is one card at a time (its file keeps everything else); starting
  // over is there, named for what it does.
  const setUp = status?.workflow ? (
    <>
      <Action.Push title="Add a Repository Card" icon={Icon.PlusCircle} target={<RepositoryList initial="" />} />
      <Action.Push
        title="Change Your Profile Card"
        icon={Icon.Person}
        target={<LookGrid target={{ kind: "profile", login: status.login }} />}
      />
      <Action.Push title="Start over with a New Workflow" icon={Icon.Wand} target={<SetupForm />} />
    </>
  ) : (
    <Action.Push title="Set up Glancecard" icon={Icon.Wand} target={<SetupForm />} />
  );
  const refresh = (
    <Action
      title="Check Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );
  if (!status) {
    return (
      <List isLoading={isLoading}>
        {error ? (
          <List.EmptyView
            icon={Icon.Warning}
            title="Could not read your GitHub"
            description={error.message}
            actions={<ActionPanel>{refresh}</ActionPanel>}
          />
        ) : null}
      </List>
    );
  }
  const { login, home, workflow, dependabot, latest, lastRun, cards } = status;
  const repo = `${login}/${login}`;
  const behind = workflow?.version && workflow.version !== latest;

  return (
    <List isLoading={isLoading} navigationTitle="Glancecard on Your GitHub">
      <List.Item
        title="Profile repository"
        subtitle={repo}
        icon={
          home ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.Circle, tintColor: Color.Orange }
        }
        accessories={[{ text: home ? `branch ${home.branch}` : "not created yet" }]}
        actions={
          <ActionPanel>
            {setUp}
            {home ? (
              <Action.OpenInBrowser title="Open on GitHub" url={home.url} />
            ) : (
              <Action.OpenInBrowser
                title="Create Profile Repository"
                url={`https://github.com/new?name=${login}&visibility=public`}
              />
            )}
            {refresh}
          </ActionPanel>
        }
      />
      <List.Item
        title="Workflow"
        subtitle={workflow ? workflow.path : "no glancecard workflow yet"}
        icon={
          workflow
            ? {
                source: behind ? Icon.ExclamationMark : Icon.CheckCircle,
                tintColor: behind ? Color.Yellow : Color.Green,
              }
            : { source: Icon.Circle, tintColor: Color.Orange }
        }
        accessories={
          workflow
            ? [
                ...(behind ? [{ tag: { value: `${latest} out`, color: Color.Yellow } }] : []),
                { text: workflow.version ?? "unpinned" },
              ]
            : [{ text: `${latest} is the latest` }]
        }
        actions={
          <ActionPanel>
            {setUp}
            {workflow ? <Action.OpenInBrowser title="Open Workflow on GitHub" url={workflow.url} /> : null}
            {workflow ? (
              <Action.OpenInBrowser
                title="Run It on GitHub"
                icon={Icon.Play}
                url={workflowRunUrl(login, workflow.path)}
              />
            ) : null}
            <Action.OpenInBrowser
              title="Release Notes"
              icon={Icon.Document}
              url="https://github.com/gfazioli/glancecard/releases"
            />
            {refresh}
          </ActionPanel>
        }
      />
      <List.Item
        title="Dependabot"
        subtitle={
          dependabot.watchesActions
            ? "moves the workflow to each new glancecard release"
            : dependabot.present
              ? "does not watch GitHub Actions yet"
              : "not set up: new releases will not reach your cards"
        }
        icon={
          dependabot.watchesActions
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Circle, tintColor: Color.Orange }
        }
        actions={
          <ActionPanel>
            {setUp}
            {refresh}
          </ActionPanel>
        }
      />
      {workflow ? (
        <List.Item
          title="Last run"
          subtitle={lastRun ? (lastRun.conclusion ?? lastRun.status) : "never run: run it once from the Actions tab"}
          icon={
            !lastRun
              ? { source: Icon.Circle, tintColor: Color.Orange }
              : lastRun.conclusion === "success"
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : lastRun.conclusion
                  ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                  : { source: Icon.Clock, tintColor: Color.Blue }
          }
          accessories={lastRun ? [{ text: ago(lastRun.at) }] : []}
          actions={
            <ActionPanel>
              {lastRun ? <Action.OpenInBrowser title="Open Run on GitHub" url={lastRun.url} /> : null}
              <Action.OpenInBrowser
                title="Run It on GitHub"
                icon={Icon.Play}
                url={workflowRunUrl(login, workflow.path)}
              />
              {refresh}
            </ActionPanel>
          }
        />
      ) : null}
      {workflow ? (
        <List.Item
          title="Cards"
          subtitle={cards.length ? cards.join(", ") : `none yet in ${workflow.outDir}/`}
          icon={{ source: Icon.Image, tintColor: cards.length ? Color.Green : Color.Orange }}
          accessories={[{ text: `${cards.length}` }]}
          actions={
            <ActionPanel>
              {home ? (
                <Action.OpenInBrowser
                  title="Open Cards on GitHub"
                  url={`${home.url}/tree/${home.branch}/${workflow.outDir}`}
                />
              ) : null}
              {setUp}
              {refresh}
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

export default withAccessToken(github)(SetUpGlancecard);
