import { Action, ActionPanel, Detail, getPreferenceValues, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DokployClient } from "../api/client";
import { readServiceLogs } from "../api/dokploy-api";
import { toErrorMessage } from "../api/errors";
import { serviceUrl } from "../lib/urls";
import { ServiceRef } from "../types/dokploy";

interface Preferences {
  logTail?: string;
}

const DEFAULT_TAIL = 200;

function resolveTail(): number {
  const raw = getPreferenceValues<Preferences>().logTail;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TAIL;
}

interface ServiceLogsProps {
  client: DokployClient;
  service: ServiceRef;
}

export function ServiceLogs({ client, service }: ServiceLogsProps) {
  const tail = resolveTail();

  const { data, isLoading, revalidate, error } = usePromise(
    async (serviceRef: ServiceRef) => readServiceLogs(client, serviceRef, { tail }),
    [service],
  );

  const body = error
    ? `> Could not load logs: ${toErrorMessage(error)}`
    : data?.trim()
      ? `\`\`\`\n${data.trimEnd()}\n\`\`\``
      : isLoading
        ? ""
        : "_No log output._";

  const markdown = `## ${service.name} - Logs\n\n${body}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${service.name} - Logs`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.CopyToClipboard title="Copy Logs" content={data ?? ""} />
          <Action.OpenInBrowser title="Open in Dokploy" url={serviceUrl(client.webUrl, service)} />
        </ActionPanel>
      }
    />
  );
}
