import { Action, ActionPanel, Color, Icon, List, Toast, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CliGuard } from "./components/CliGuard";
import { SkillActions } from "./components/SkillActions";
import { deploySkills, installSkill, installedRef, searchSkills } from "./lib/api";
import { useAgents, usePresets, useSkills, useTags } from "./hooks/useLibrary";
import { useCliAction } from "./hooks/useCliAction";
import { LOW_INSTALL_THRESHOLD, deployTargets, formatInstalls } from "./lib/presentation";
import { Agent, SearchResult } from "./lib/types";

export default function Command() {
  return <CliGuard>{() => <SearchSkills />}</CliGuard>;
}

function SearchSkills() {
  const [query, setQuery] = useState("");
  const runAction = useCliAction();

  const results = useCachedPromise(
    async (text: string): Promise<SearchResult[]> => (text.trim().length < 2 ? [] : searchSkills(text.trim())),
    [query],
    { keepPreviousData: true, failureToastOptions: { title: "Search failed" } },
  );

  const library = useSkills();
  const agents = useAgents();
  const presets = usePresets();
  const tags = useTags();

  const { ready } = deployTargets(agents.data ?? []);

  // Keyed by the marketplace ref, not the name. Names are not unique in the
  // library — a local skill called `commit` is not getsentry's `commit` — and
  // keying on one would hide the install actions for a skill the user does not
  // have. Skillssh installs record `source_ref` as exactly this `install_ref`.
  const installedByRef = new Map(
    (library.data ?? [])
      .filter((skill) => skill.source_type === "skillssh" && skill.source_ref)
      .map((skill) => [skill.source_ref as string, skill]),
  );

  function refresh() {
    library.revalidate();
    agents.revalidate();
    presets.revalidate();
    tags.revalidate();
  }

  /**
   * Installing lands the skill in the central library only — it stays invisible
   * to every agent until it is deployed. That is the single most common
   * surprise with this CLI, so the success toast carries the follow-up rather
   * than leaving the user to discover the gap.
   */
  async function install(result: SearchResult, thenDeployTo?: Agent) {
    const outcome = await runAction({
      pending: `Installing ${result.name}…`,
      run: () => installSkill(result.install_ref),
      success: () =>
        thenDeployTo
          ? { title: `Installed ${result.name}`, message: `Deploying to ${thenDeployTo.display_name}…` }
          : {
              title: `Installed ${result.name}`,
              message: "It is in your library. Deploy it to make an agent see it.",
            },
      failureTitle: `Could not install ${result.name}`,
      onSuccess: refresh,
    });
    if (!outcome.ok) return;

    // Deploy what was just installed, not whatever else answers to this name.
    const ref = installedRef(outcome.value, result.name);

    if (thenDeployTo) {
      await runAction({
        pending: `Deploying to ${thenDeployTo.display_name}…`,
        run: () => deploySkills([ref], [thenDeployTo.key]),
        success: () => ({ title: `${result.name} is live in ${thenDeployTo.display_name}` }),
        failureTitle: `Installed, but could not deploy to ${thenDeployTo.display_name}`,
        onSuccess: refresh,
      });
      return;
    }

    if (ready.length === 0) return;
    await showToast({
      style: Toast.Style.Success,
      title: `Installed ${result.name}`,
      message: "Library only — deploy it to make an agent see it.",
      primaryAction: {
        title: `Deploy to ${ready[0].display_name}`,
        onAction: (toast) => {
          toast.hide();
          runAction({
            pending: `Deploying to ${ready[0].display_name}…`,
            run: () => deploySkills([ref], [ready[0].key]),
            success: () => ({ title: `${result.name} is live in ${ready[0].display_name}` }),
            failureTitle: "Could not deploy",
            onSuccess: refresh,
          });
        },
      },
    });
  }

  return (
    <List
      isLoading={results.isLoading}
      throttle
      searchBarPlaceholder="Search the skills.sh marketplace"
      onSearchTextChange={setQuery}
    >
      <List.EmptyView
        icon={query.trim().length < 2 ? Icon.MagnifyingGlass : Icon.QuestionMarkCircle}
        title={query.trim().length < 2 ? "Search skills.sh" : `Nothing found for “${query.trim()}”`}
        description={
          query.trim().length < 2
            ? "Type at least two characters to search the marketplace for skills you can install."
            : "Try broader wording, or install directly from a git URL with the CLI."
        }
      />
      {(results.data ?? []).map((result) => {
        const alreadyInstalled = installedByRef.get(result.install_ref);
        return (
          <List.Item
            key={result.install_ref}
            icon={alreadyInstalled ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Store}
            title={result.name}
            subtitle={result.source}
            accessories={accessoriesFor(result, Boolean(alreadyInstalled))}
            actions={
              alreadyInstalled ? (
                <SkillActions
                  skill={alreadyInstalled}
                  agents={agents.data}
                  presets={presets.data}
                  knownTags={tags.data ?? []}
                  onRefresh={refresh}
                >
                  <Action.OpenInBrowser title="Open on Skills.sh" url={result.skills_sh_url} />
                </SkillActions>
              ) : (
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Install to Library" icon={Icon.Download} onAction={() => install(result)} />
                    {ready.length > 0 && (
                      <ActionPanel.Submenu
                        title="Install and Deploy to"
                        icon={Icon.Upload}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      >
                        {ready.map((agent) => (
                          <Action
                            key={agent.key}
                            title={agent.display_name}
                            icon={Icon.Terminal}
                            onAction={() => install(result, agent)}
                          />
                        ))}
                      </ActionPanel.Submenu>
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open on Skills.sh" url={result.skills_sh_url} />
                    <Action.CopyToClipboard
                      title="Copy Install Ref"
                      content={result.install_ref}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}

function accessoriesFor(result: SearchResult, installed: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  // Install count is the only trust signal the marketplace gives us, so it
  // stays visible, and an unusually low one is called out rather than left
  // for the user to notice.
  if (result.installs < LOW_INSTALL_THRESHOLD) {
    accessories.push({
      icon: { source: Icon.Warning, tintColor: Color.Orange },
      tooltip: "Few installs — worth reading the source repository before trusting it.",
    });
  }
  accessories.push({
    icon: Icon.Download,
    text: formatInstalls(result.installs),
    tooltip: `${result.installs.toLocaleString()} installs`,
  });
  if (installed) {
    accessories.push({ tag: { value: "In library", color: Color.Green } });
  }

  return accessories;
}
