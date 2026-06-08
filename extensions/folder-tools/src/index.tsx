import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import React from "react";
import {
  ResultDetail,
  binPath,
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

function isLongWorkflow(workflow: Workflow): boolean {
  return Boolean(
    workflows.find((candidate) => candidate.value === workflow)?.longRunning,
  );
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
    <List searchBarPlaceholder="Buscar herramientas genericas para carpetas">
      <List.Section title="Carpeta por defecto">
        <List.Item
          icon={Icon.Folder}
          title="Abrir Carpeta"
          subtitle={target}
          actions={
            <ActionPanel>
              <Action
                title="Abrir"
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
          subtitle="Comprueba toolsRoot, graphify, agent-brain y Understand-Anything"
          accessories={[{ text: "Raycast" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar Y Ver Salida"
                icon={Icon.Play}
                onAction={() => runAndPush(() => runStatus(target))}
              />
              <Action
                title="Abrir En Terminal"
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
          subtitle="Inventario rapido sin LLM"
          accessories={[{ text: "Raycast" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar Y Ver Salida"
                icon={Icon.Play}
                onAction={() => runAndPush(() => runGraphifyDetect(target))}
              />
              <Action
                title="Abrir Reporte"
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
          subtitle="Genera graph.json y HTML/JSON"
          accessories={[{ text: "Terminal" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar En Terminal"
                icon={Icon.Terminal}
                onAction={() => runWorkflowTerminal("graphify-extract", target)}
              />
              <Action
                title="Abrir Salida Graphify-Out"
                icon={Icon.Folder}
                onAction={() => openPath(target + "/graphify-out")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Flujos genericos">
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
                      ? "Ejecutar En Terminal"
                      : "Ejecutar Y Ver Salida"
                  }
                  icon={workflow.longRunning ? Icon.Terminal : Icon.Play}
                  onAction={() => runWorkflow(workflow.value)}
                />
                <Action
                  title="Ejecutar En Terminal"
                  icon={Icon.Terminal}
                  onAction={() => runWorkflowTerminal(workflow.value, target)}
                />
                <Action.CopyToClipboard
                  title="Copiar Target"
                  content={target}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Aperturas">
        <List.Item
          icon={Icon.Folder}
          title="Abrir Tools Root"
          subtitle={p.toolsRoot}
          actions={
            <ActionPanel>
              <Action
                title="Abrir"
                icon={Icon.Folder}
                onAction={() => openPath(p.toolsRoot)}
              />
              <Action.ShowInFinder path={p.toolsRoot} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Globe}
          title="Abrir Neo4j Browser"
          subtitle={neo4jUrl}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={neo4jUrl} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.TextDocument}
          title="Abrir Understand-Anything Repo"
          subtitle={understandRepo()}
          actions={
            <ActionPanel>
              <Action
                title="Abrir"
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
                title="Ejecutar Y Ver Salida"
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
