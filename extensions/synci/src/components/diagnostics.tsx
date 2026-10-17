import { Action, Clipboard, environment } from "@raycast/api";
import { errorDiagnostics } from "../lib/diagnostics";

export const diagnosticReport = (error: unknown) =>
  errorDiagnostics(error, {
    command: environment.commandName,
    raycast: environment.raycastVersion,
    platform: process.platform,
  });

export const copyDiagnostics = (error: unknown) => Clipboard.copy(diagnosticReport(error));

export function CopyErrorDetails({ error }: { error: unknown }) {
  return <Action.CopyToClipboard title="Copy Error Details" content={diagnosticReport(error)} />;
}
