import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { endpointOf, readFile, webUrlFor } from "../lib/api";
import { codeBlock, errorMessage, fileIcon, formatRelative } from "../lib/format";
import { cmdOrCtrl } from "../lib/shortcuts";
import type { ValFile } from "../lib/types";
import { LogList } from "./LogList";
import { RunResult } from "./RunResult";
import { ScheduleDetail } from "./ScheduleDetail";
import { TraceList } from "./TraceList";

export function FileDetail({ val, branch, file }: { val: string; branch: string; file: ValFile }) {
  const endpoint = endpointOf(file);

  const { data, isLoading, error } = useCachedPromise(
    (identifier: string, path: string, currentBranch: string) => readFile(identifier, path, { branch: currentBranch }),
    [val, file.path, branch],
  );

  const markdown = error
    ? `## Could not read this file\n\n${errorMessage(error)}`
    : codeBlock(data?.content ?? "", file.path);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${val} / ${file.path}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item
              text={file.type}
              color={fileIcon(file.type).tintColor ?? Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Version" text={`v${file.version}`} />
          <Detail.Metadata.Label title="Updated" text={formatRelative(file.updatedAt)} />
          <Detail.Metadata.Label title="Branch" text={branch} />
          {endpoint ? <Detail.Metadata.Link title="Endpoint" target={endpoint} text={new URL(endpoint).host} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Traces"
              icon={Icon.List}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              target={<TraceList fileId={file.id} fileName={file.path} />}
            />
            <Action.Push
              title="View Logs"
              icon={Icon.Terminal}
              shortcut={cmdOrCtrl("l")}
              target={<LogList fileId={file.id} fileName={file.path} />}
            />
            {file.type === "interval" ? (
              <Action.Push
                title="View Schedule"
                icon={Icon.Clock}
                target={<ScheduleDetail val={val} path={file.path} branch={branch} />}
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {endpoint ? (
              <Action.Push
                title="Fetch Endpoint"
                icon={Icon.Globe}
                target={<RunResult mode="fetch" val={val} path={file.path} endpoint={endpoint} />}
              />
            ) : null}
            {file.type !== "file" ? (
              <Action.Push
                title="Run File"
                icon={Icon.Play}
                target={<RunResult mode="run" val={val} path={file.path} branch={branch} />}
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.OpenInBrowser title="Edit in Val Town" url={webUrlFor(val, file.path)} />
            <Action.CopyToClipboard title="Copy Code" content={data?.content ?? ""} />
            {endpoint ? <Action.CopyToClipboard title="Copy Endpoint" content={endpoint} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
