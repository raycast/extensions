import { Action, ActionPanel, Color, Detail, environment, Icon, open, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useRef } from "react";
import {
  buildCurl,
  codeBlock,
  executeGraphQL,
  ExecutionResult,
  formatBytes,
  GraphQLRequestBody,
  isSuccessful,
} from "../lib/request";
import { Shortcuts } from "../lib/shortcuts";
import { GraphQLEnvironment } from "../lib/types";

/** Raycast renders very large markdown slowly; longer responses are truncated in the preview only. */
const MAX_PREVIEW_CHARS = 100_000;
const MAX_LISTED_ERRORS = 3;

interface Props {
  title: string;
  env: GraphQLEnvironment;
  request: GraphQLRequestBody;
  /** Base name of the file written by "Open in Editor" */
  fileName: string;
}

function prettyBody(result: ExecutionResult): string {
  if (result.json !== undefined) return JSON.stringify(result.json, null, 2);
  return result.rawBody;
}

function errorMessages(result: ExecutionResult): string[] {
  const errors = (result.json as { errors?: { message?: unknown }[] } | undefined)?.errors;
  if (!Array.isArray(errors)) return [];
  return errors.map((error) => (typeof error?.message === "string" ? error.message : JSON.stringify(error)));
}

function buildMarkdown(result: ExecutionResult | undefined, env: GraphQLEnvironment, label: string): string {
  if (!result) return `Running **${label}** on _${env.name}_…`;
  if (result.error) {
    return `## Request failed\n\n${result.error}\n\n${codeBlock("text", `POST ${env.url}`)}`;
  }

  const parts: string[] = [];
  const messages = errorMessages(result);
  if (messages.length) {
    const listed = messages.slice(0, MAX_LISTED_ERRORS).map((message) => `> • ${message.replace(/\n/g, " ")}`);
    if (messages.length > MAX_LISTED_ERRORS) listed.push(`> • …and ${messages.length - MAX_LISTED_ERRORS} more`);
    parts.push(
      `> ⚠️ **${messages.length} GraphQL ${messages.length === 1 ? "error" : "errors"}**\n>\n${listed.join("\n")}`,
    );
  } else if (result.status !== undefined && result.status >= 400) {
    parts.push(`> ⚠️ **HTTP ${result.status} ${result.statusText ?? ""}**`);
  }

  let body = prettyBody(result);
  if (!body) {
    parts.push("_Empty response body_");
    return parts.join("\n\n");
  }
  if (body.length > MAX_PREVIEW_CHARS) {
    parts.push(
      `> Response is ${formatBytes(result.size)}, showing the first ${formatBytes(MAX_PREVIEW_CHARS)}. ` +
        "Use **Open in Editor** or **Copy Response** to get all of it.",
    );
    body = `${body.slice(0, MAX_PREVIEW_CHARS)}\n…`;
  }
  const language = result.json !== undefined ? "json" : /^\s*</.test(body) ? "html" : "text";
  parts.push(codeBlock(language, body));
  return parts.join("\n\n");
}

export function ResultView({ title, env, request, fileName }: Props) {
  const abortable = useRef<AbortController>(null);
  const operationLabel = request.operationName ?? "anonymous operation";

  const {
    data: result,
    isLoading,
    revalidate,
  } = usePromise(
    (target: GraphQLEnvironment, body: GraphQLRequestBody) =>
      executeGraphQL(target, body, { signal: abortable.current?.signal }),
    [env, request],
    {
      abortable,
      async onData(data) {
        if (data.error) {
          if (data.error !== "Request cancelled") {
            await showToast({ style: Toast.Style.Failure, title: "Request failed", message: data.error });
          }
        } else if (data.graphQLErrorCount > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: `${data.graphQLErrorCount} GraphQL ${data.graphQLErrorCount === 1 ? "error" : "errors"}`,
            message: errorMessages(data)[0],
          });
        } else if (data.status !== undefined && data.status >= 400) {
          await showToast({ style: Toast.Style.Failure, title: `HTTP ${data.status}`, message: data.statusText });
        }
      },
    },
  );

  const body = result ? prettyBody(result) : "";
  const data = (result?.json as { data?: unknown } | undefined)?.data;
  const variableNames = Object.keys(request.variables ?? {});

  async function openInEditor() {
    try {
      const directory = join(environment.supportPath, "responses");
      await mkdir(directory, { recursive: true });
      const extension = result?.json !== undefined ? "json" : "txt";
      const path = join(directory, `${fileName}.${extension}`);
      await writeFile(path, body);
      await open(path);
    } catch (error) {
      await showFailureToast(error, { title: "Could not open response" });
    }
  }

  const ok = result ? isSuccessful(result) : false;
  const statusText = result?.error
    ? "Network error"
    : result?.status !== undefined
      ? `${result.status} ${result.statusText ?? ""}`.trim()
      : "—";

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={buildMarkdown(result, env, operationLabel)}
      metadata={
        result && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={statusText} color={ok ? Color.Green : Color.Red} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Time" text={`${result.durationMs} ms`} icon={Icon.Clock} />
            {!result.error && <Detail.Metadata.Label title="Size" text={formatBytes(result.size)} />}
            {result.graphQLErrorCount > 0 && (
              <Detail.Metadata.Label
                title="GraphQL Errors"
                text={{ value: String(result.graphQLErrorCount), color: Color.Red }}
                icon={Icon.Warning}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Environment" text={env.name} icon={Icon.Globe} />
            <Detail.Metadata.Label title="Endpoint" text={env.url} />
            <Detail.Metadata.Label title="Operation" text={operationLabel} />
            {variableNames.length > 0 && (
              <Detail.Metadata.Label title="Variables" text={variableNames.map((name) => `$${name}`).join(", ")} />
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {body && <Action.CopyToClipboard title="Copy Response" content={body} />}
            {data !== undefined && (
              <Action.CopyToClipboard
                title="Copy Data Field"
                content={JSON.stringify(data, null, 2)}
                shortcut={Shortcuts.CopySecondary}
              />
            )}
            <Action title="Run Again" icon={Icon.Play} shortcut={Shortcuts.Rerun} onAction={revalidate} />
            {body && (
              <Action
                title="Open in Editor"
                icon={Icon.AppWindow}
                shortcut={Shortcuts.OpenInEditor}
                onAction={openInEditor}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy as Curl Command"
              content={buildCurl(env, request)}
              concealed
              shortcut={Shortcuts.CopyCurl}
            />
            {variableNames.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Variables"
                content={JSON.stringify(request.variables, null, 2)}
                shortcut={Shortcuts.Copy}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
