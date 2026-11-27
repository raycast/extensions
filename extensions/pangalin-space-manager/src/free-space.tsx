import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { openInSpaceManager, openSpaceManagerApp } from "./app";
import { describeSpace, formatBytes, getStartupDiskSpace } from "./disk";
import { links } from "./links";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(getStartupDiskSpace);

  let markdown = "";
  if (error) {
    markdown = `# Couldn't read disk space\n\n${error.message}`;
  } else if (data) {
    const usedPercent = Math.round(((data.totalBytes - data.freeBytes) / data.totalBytes) * 100);
    markdown = `# ${describeSpace(data)}\n\nYour startup disk is ${usedPercent}% full.\n\nThis is the space macOS reports as available now. Finder can show more, sometimes a lot more, because it also counts space macOS says it can clear on its own (purgeable space). Pangalin Space Manager shows both.`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Free" text={formatBytes(data.freeBytes)} />
            <Detail.Metadata.Label title="Used" text={formatBytes(data.totalBytes - data.freeBytes)} />
            <Detail.Metadata.Label title="Total" text={formatBytes(data.totalBytes)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action title="Open Space Manager" icon={Icon.HardDrive} onAction={openSpaceManagerApp} />
          <Action
            title="See What's Taking up Space"
            icon={Icon.PieChart}
            onAction={() => openInSpaceManager(links.dashboard)}
          />
          {data ? <Action.CopyToClipboard title="Copy Free Space" content={describeSpace(data)} /> : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
