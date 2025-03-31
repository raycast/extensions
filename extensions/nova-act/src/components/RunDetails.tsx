import { Action, ActionPanel, Detail } from "@raycast/api";

function parseUsingMarkers(startMarker: string, endMarker: string, log: string) {
  if (log.includes(startMarker) && log.includes(endMarker)) {
    const parts = log.split(startMarker);
    if (parts.length > 1) {
      return parts[1].split(endMarker)[0];
    }
  }
}

export function maybeParseSessionId(log: string) {
  const match = log.match(/start session ([\w-]{36})\b/);
  const sessionIdMatch = match?.[1];
  if (sessionIdMatch !== undefined) {
    return sessionIdMatch;
  }

  // Try parsing based on the final return markers

  const RETURN_START_MARKER = "::return_start::";
  const RETURN_END_MARKER = "::return_end::";
  return parseUsingMarkers(RETURN_START_MARKER, RETURN_END_MARKER, log);
}

function maybeParseReturnValues(log: string) {
  const RETURN_START_MARKER = "::return_start::";
  const RETURN_END_MARKER = "::return_end::";
  return parseUsingMarkers(RETURN_START_MARKER, RETURN_END_MARKER, log);
}

function maybeParseLogsDirectory(log: string) {
  const LOGS_DIRECTORY_START_MARKER = "::logs_directory_start::";
  const LOGS_DIRECTORY_END_MARKER = "::logs_directory_end::";
  const directory = parseUsingMarkers(LOGS_DIRECTORY_START_MARKER, LOGS_DIRECTORY_END_MARKER, log);
  if (directory === undefined) {
    return;
  }
  return directory.trim();
}

function tryFormatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If parsing fails, return the original value.
    return value;
  }
}

export default function RunDetails({ logs, stopCurrentActRun }: { logs: string; stopCurrentActRun?: () => void }) {
  const returnValue = maybeParseReturnValues(logs) ?? "";
  const logsDirectory = maybeParseLogsDirectory(logs) ?? "";
  const formattedReturnValue = tryFormatJson(returnValue);

  const returnValuesMarkdown = `# Return Values

\`\`\`json
${formattedReturnValue}
\`\`\`

---`;

  const logsMarkdown = `

# Nova Act Logs

\`\`\`
${logs}
\`\`\``;

  const markdownContent = returnValue.trim() !== "" ? returnValuesMarkdown + logsMarkdown : logsMarkdown;

  return (
    <Detail
      markdown={markdownContent}
      actions={
        <ActionPanel>
          {logsDirectory !== "" && <Action.ShowInFinder title="Open Logs Directory" path={logsDirectory} />}
          {stopCurrentActRun !== undefined && <Action title="Stop Current Act Run" onAction={stopCurrentActRun} />}
        </ActionPanel>
      }
    />
  );
}
