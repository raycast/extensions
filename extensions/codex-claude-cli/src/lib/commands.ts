import { ChatSession } from "./types";
import { permissionProfile } from "./permissions";
import { sessionStartupConfiguration } from "./startup-config";

export interface ResumeCommand {
  executable: "claude" | "codex";
  arguments: string[];
  display: string;
}

export function buildResumeCommand(session: ChatSession, options?: { permissionProfileId?: string }): ResumeCommand {
  const permissions = permissionProfile(session.provider, options?.permissionProfileId);
  const startup = sessionStartupConfiguration(session);
  if (session.provider === "codex") {
    const modelArguments = startup.modelId ? ["-m", startup.modelId] : [];
    const effortArguments = startup.effort ? ["-c", `model_reasoning_effort=${startup.effort}`] : [];
    const configurationArguments = [
      ["service_tier", startup.fastMode ? "fast" : "flex"],
      ["personality", startup.codexPersonality],
      ["model_verbosity", startup.codexModelVerbosity],
      ["model_reasoning_summary", startup.codexReasoningSummary],
    ].flatMap(([key, value]) => (value && value !== "inherit" ? ["-c", `${key}=${value}`] : []));
    const argumentsList = [
      ...permissions.arguments,
      ...modelArguments,
      ...effortArguments,
      ...configurationArguments,
      "resume",
      session.id,
    ];
    return {
      executable: "codex",
      arguments: argumentsList,
      display: formatCommand("codex", argumentsList),
    };
  }

  const settings = {
    fastMode: startup.fastMode,
    ...(startup.claudeOutputStyle === "inherit" ? {} : { outputStyle: startup.claudeOutputStyle }),
    ...(startup.claudeViewMode === "inherit" ? {} : { viewMode: startup.claudeViewMode }),
  };
  const argumentsList = [
    ...permissions.arguments,
    ...(startup.modelId ? ["--model", startup.modelId] : []),
    ...(startup.effort && startup.effort !== "auto" ? ["--effort", startup.effort] : []),
    "--settings",
    JSON.stringify(settings),
    "--resume",
    session.id,
  ];
  return {
    executable: "claude",
    arguments: argumentsList,
    display: formatCommand("claude", argumentsList),
  };
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function formatCommand(executable: string, argumentsList: string[]): string {
  return [
    executable,
    ...argumentsList.map((argument) => (/^[A-Za-z0-9_./:=+-]+$/.test(argument) ? argument : shellQuote(argument))),
  ].join(" ");
}
