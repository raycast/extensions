import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import React from "react";
import {
  ResultDetail,
  binPath,
  isLongWorkflow,
  openPath,
  prefs,
  runGraphifyDetect,
  runInTerminal,
  runShellCapture,
  runStatus,
  runWorkflowCapture,
  runWorkflowTerminal,
  shellEscape,
  understandRepo,
  workflows,
  type CommandResult,
  type Workflow,
} from "./lib";

type Runner = () => Promise<CommandResult>;

function useResultRunner() {
  const { push } = useNavigation();

  return async function runAndPush(runner: Runner) {
    const result = await runner();
    push(<ResultDetail result={result} />);
  };
}

export default function Command() {
  const runAndPush = useResultRunner();
  const p = prefs();
  const target = p.defaultTarget;
  const neo4jUrl = p.neo4jUrl || "http://localhost:17723";

  async function runWorkflow(workflow: Workflow) {
    if (isLongWorkflow(workflow)) {
      await runWorkflowTerminal(workflow, target);
      return;
    }
    await runAndPush(() => runWorkflowCapture(workflow, target));
  }

  return (
    <List searchBarPlaceholder="Search folder tools and workflows">
      <List.Section title="Default Folder">
        <List.Item
          icon={Icon.Folder}
          title="Open Folder"
          subtitle={target}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.Folder}
                onAction={() => openPath(target)}
              />
              <Action.ShowInFinder path={target} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.CheckCircle}
          title="Status"
          subtitle="Check toolsRoot, graphify, agent-brain and Understand-Anything"
          accessories={[{ text: "Raycast" }]}
          actions={
            <ActionPanel>
              <Action
                title="Run and Show Output"
                icon={Icon.Play}
                onAction={() => runAndPush(() => runStatus(target))}
              />
              <Action
                title="Open in Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    "echo Tools root: " +
                      shellEscape(p.toolsRoot) +
                      " && " +
                      shellEscape(binPath("agent-brain")) +
                      " doctor",
                    target,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Dot}
          title="Graphify Detect"
          subtitle="Quick inventory without an LLM"
          accessories={[{ text: "Raycast" }]}
          actions={
            <ActionPanel>
              <Action
                title="Run and Show Output"
                icon={Icon.Play}
                onAction={() => runAndPush(() => runGraphifyDetect(target))}
              />
              <Action
                title="Open Report"
                icon={Icon.TextDocument}
                onAction={() =>
                  openPath(target + "/graphify-out/GRAPHIFY_DETECT_REPORT.md")
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Clock}
          title="Graphify Extract"
          subtitle="Generate graph.json plus HTML/JSON outputs"
          accessories={[{ text: "Terminal" }]}
          actions={
            <ActionPanel>
              <Action
                title="Run in Terminal"
                icon={Icon.Terminal}
                onAction={() => runWorkflowTerminal("graphify-extract", target)}
              />
              <Action
                title="Open Graphify Output"
                icon={Icon.Folder}
                onAction={() => openPath(target + "/graphify-out")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Generic Workflows">
        {workflows.map((workflow) => (
          <List.Item
            key={workflow.value}
            icon={workflow.longRunning ? Icon.Clock : Icon.Dot}
            title={workflow.title}
            subtitle={workflow.description}
            accessories={[
              { text: workflow.longRunning ? "Terminal" : "Raycast" },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={
                    workflow.longRunning
                      ? "Run in Terminal"
                      : "Run and Show Output"
                  }
                  icon={workflow.longRunning ? Icon.Terminal : Icon.Play}
                  onAction={() => runWorkflow(workflow.value)}
                />
                <Action
                  title="Run in Terminal"
                  icon={Icon.Terminal}
                  onAction={() => runWorkflowTerminal(workflow.value, target)}
                />
                <Action.CopyToClipboard
                  title="Copy Target"
                  content={target}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Open">
        <List.Item
          icon={Icon.Folder}
          title="Open Tools Root"
          subtitle={p.toolsRoot}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.Folder}
                onAction={() => openPath(p.toolsRoot)}
              />
              <Action.ShowInFinder path={p.toolsRoot} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Globe}
          title="Open Neo4j Browser"
          subtitle={neo4jUrl}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={neo4jUrl} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.TextDocument}
          title="Open Understand-Anything Repo"
          subtitle={understandRepo()}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                icon={Icon.Folder}
                onAction={() => openPath(understandRepo())}
              />
              <Action.ShowInFinder path={understandRepo()} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.QuestionMark}
          title="graphify --help"
          subtitle={binPath("graphify")}
          actions={
            <ActionPanel>
              <Action
                title="Run and Show Output"
                icon={Icon.Play}
                onAction={() =>
                  runAndPush(() =>
                    runShellCapture(
                      "graphify help",
                      shellEscape(binPath("graphify")) + " --help",
                      target,
                    ),
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
