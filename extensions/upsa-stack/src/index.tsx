import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import React from "react";
import {
  ResultDetail,
  graphToolsBin,
  openPath,
  prefs,
  runCapture,
  runFolderCapture,
  runFolderTerminal,
  runInTerminal,
  runShellCapture,
  shellEscape,
  stackScript,
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

function workflowTitle(workflow: Workflow): string {
  const item = workflows.find((candidate) => candidate.value === workflow);
  return item ? item.title : workflow;
}

function isLongWorkflow(workflow: Workflow): boolean {
  return Boolean(
    workflows.find((candidate) => candidate.value === workflow)?.longRunning,
  );
}

export default function Command() {
  const runAndPush = useResultRunner();
  const p = prefs();
  const mauiProject =
    p.upsaDir +
    "/tecnologias-moviles/sandbox/UPSAExamMauiSmokeTest/UPSAExamMauiSmokeTest.csproj";
  const simulacro = p.upsaDir + "/enunciados/simulacro-01";

  async function runWorkflow(workflow: Workflow) {
    if (isLongWorkflow(workflow)) {
      await runFolderTerminal(workflow, p.defaultTarget);
      return;
    }
    await runAndPush(() => runFolderCapture(workflow, p.defaultTarget));
  }

  return (
    <List searchBarPlaceholder="Buscar comandos UPSA, MAUI, graphify, brain, Flowise">
      <List.Section title="Preparacion UPSA">
        <List.Item
          icon={Icon.Hammer}
          title="Preparacion Completa del Stack"
          subtitle="_stack/upsa-preparacion-completa.sh"
          accessories={[{ text: "Terminal" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar En Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    shellEscape(stackScript("upsa-preparacion-completa.sh")),
                    p.upsaDir,
                  )
                }
              />
              <Action
                title="Ejecutar Sin Build"
                icon={Icon.Forward}
                onAction={() =>
                  runInTerminal(
                    shellEscape(stackScript("upsa-preparacion-completa.sh")) +
                      " --no-build",
                    p.upsaDir,
                  )
                }
              />
              <Action.ShowInFinder
                path={stackScript("upsa-preparacion-completa.sh")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.CheckCircle}
          title="Preflight Rapido"
          subtitle="macOS, Xcode, VS Code, dotnet, workloads"
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar Capturando Salida"
                icon={Icon.Play}
                onAction={() =>
                  runAndPush(() =>
                    runCapture(
                      "preparacion sin build",
                      stackScript("upsa-preparacion-completa.sh"),
                      ["--no-build", "--no-graphify"],
                      p.upsaDir,
                    ),
                  )
                }
              />
              <Action
                title="Abrir En Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    shellEscape(stackScript("upsa-preparacion-completa.sh")) +
                      " --no-build --no-graphify",
                    p.upsaDir,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Download}
          title="Instalar O Actualizar Graph Stack"
          subtitle="_stack/install-upsa-graph-stack.sh --target UPSA --yes"
          accessories={[{ text: "Terminal" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar En Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    shellEscape(stackScript("install-upsa-graph-stack.sh")) +
                      " --target " +
                      shellEscape(p.upsaDir) +
                      " --yes",
                    p.upsaDir,
                  )
                }
              />
              <Action.ShowInFinder
                path={stackScript("install-upsa-graph-stack.sh")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Run Folder Graph Brain">
        <List.Item
          icon={Icon.List}
          title="Abrir Menu Interactivo run-folder"
          subtitle={p.defaultTarget}
          accessories={[{ text: "Terminal" }]}
          actions={
            <ActionPanel>
              <Action
                title="Abrir Menu"
                icon={Icon.Terminal}
                onAction={() => runFolderTerminal("menu", p.defaultTarget)}
              />
              <Action.Push
                title="Elegir Carpeta Y Flujo"
                icon={Icon.Gear}
                target={<RunFolderHint />}
              />
            </ActionPanel>
          }
        />
        {workflows
          .filter((workflow) => workflow.value !== "menu")
          .map((workflow) => (
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
                    onAction={() =>
                      runFolderTerminal(workflow.value, p.defaultTarget)
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copiar Comando"
                    content={
                      shellEscape(stackScript("run-folder.sh")) +
                      " " +
                      shellEscape(p.defaultTarget) +
                      " " +
                      workflow.value
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      <List.Section title="Simulacros y MAUI">
        <List.Item
          icon={Icon.Document}
          title="Ejecutar Simulacro 01"
          subtitle={simulacro}
          accessories={[{ text: "Terminal" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar En Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    shellEscape(stackScript("run-simulacro.sh")) +
                      " " +
                      shellEscape(simulacro),
                    p.upsaDir,
                  )
                }
              />
              <Action.ShowInFinder path={simulacro} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Code}
          title="Build MAUI MacCatalyst Validado"
          subtitle="dotnet build -f net9.0-maccatalyst"
          accessories={[{ text: "Raycast" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar Y Ver Salida"
                icon={Icon.Play}
                onAction={() =>
                  runAndPush(() =>
                    runShellCapture(
                      "build maui maccatalyst",
                      "dotnet build " +
                        shellEscape(mauiProject) +
                        " -f net9.0-maccatalyst",
                      p.upsaDir,
                    ),
                  )
                }
              />
              <Action
                title="Abrir En Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    "dotnet build " +
                      shellEscape(mauiProject) +
                      " -f net9.0-maccatalyst",
                    p.upsaDir,
                  )
                }
              />
              <Action.ShowInFinder path={mauiProject} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Flowise">
        <List.Item
          icon={Icon.Network}
          title="Arrancar Flowise Local"
          subtitle="_stack/start-flowise.sh"
          accessories={[{ text: "Terminal" }]}
          actions={
            <ActionPanel>
              <Action
                title="Arrancar En Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    shellEscape(stackScript("start-flowise.sh")),
                    p.upsaDir,
                  )
                }
              />
              <Action.OpenInBrowser
                title="Abrir Flowise"
                url="http://localhost:3000"
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Stars}
          title="Ejecutar Prediccion Flowise"
          subtitle="_stack/run-flowise-prediction.sh"
          accessories={[{ text: "Raycast" }]}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar Y Ver Salida"
                icon={Icon.Play}
                onAction={() =>
                  runAndPush(() =>
                    runCapture(
                      "flowise prediction",
                      stackScript("run-flowise-prediction.sh"),
                      [],
                      p.upsaDir,
                    ),
                  )
                }
              />
              <Action
                title="Abrir En Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  runInTerminal(
                    shellEscape(stackScript("run-flowise-prediction.sh")),
                    p.upsaDir,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Ayudas y Aperturas">
        <List.Item
          icon={Icon.Folder}
          title="Abrir Vault Obsidian UPSA"
          subtitle={p.upsaDir + "/_obsidian"}
          actions={
            <ActionPanel>
              <Action
                title="Abrir"
                icon={Icon.Folder}
                onAction={() => openPath(p.upsaDir + "/_obsidian")}
              />
              <Action.ShowInFinder path={p.upsaDir + "/_obsidian"} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Globe}
          title="Abrir Neo4j Browser"
          subtitle="http://localhost:17723"
          accessories={[{ text: "neo4j / agentbrain" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="http://localhost:17723" />
              <Action.CopyToClipboard
                title="Copiar Credenciales"
                content="neo4j / agentbrain"
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Folder}
          title="Abrir Logs UPSA"
          subtitle={p.upsaDir + "/_logs"}
          actions={
            <ActionPanel>
              <Action
                title="Abrir"
                icon={Icon.Folder}
                onAction={() => openPath(p.upsaDir + "/_logs")}
              />
              <Action.ShowInFinder path={p.upsaDir + "/_logs"} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.QuestionMark}
          title="graphify --help"
          subtitle={graphToolsBin("graphify")}
          actions={
            <ActionPanel>
              <Action
                title="Ejecutar Y Ver Salida"
                icon={Icon.Play}
                onAction={() =>
                  runAndPush(() =>
                    runCapture(
                      "graphify help",
                      graphToolsBin("graphify"),
                      ["--help"],
                      p.upsaDir,
                    ),
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.TextDocument}
          title="Abrir README Stack UPSA"
          subtitle={p.upsaDir + "/README-STACK-UPSA.md"}
          actions={
            <ActionPanel>
              <Action
                title="Abrir"
                icon={Icon.TextDocument}
                onAction={() => openPath(p.upsaDir + "/README-STACK-UPSA.md")}
              />
              <Action.ShowInFinder path={p.upsaDir + "/README-STACK-UPSA.md"} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function RunFolderHint() {
  const markdown =
    "# Run Folder\n\n" +
    "Usa el comando independiente de Raycast llamado **Run Folder** para elegir carpeta, flujo, pregunta y modo de ejecucion.\n\n" +
    "Flujos disponibles:\n\n" +
    workflows
      .map(
        (workflow) =>
          "- " + workflowTitle(workflow.value) + ": " + workflow.description,
      )
      .join("\n");

  return (
    <ResultDetail
      result={{
        title: "Run Folder",
        command: "Raycast command: Run Folder",
        cwd: prefs().upsaDir,
        stdout: markdown,
        stderr: "",
        exitCode: 0,
      }}
    />
  );
}
