import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { status as getStatus } from "./lib";

type StatusData = {
  on: boolean;
  pid?: string;
  raw: string;
  sleepDisabled?: string;
  sleep?: string;
  displaySleep?: string;
  diskSleep?: string;
};

function parseStatus(raw: string): StatusData {
  const on = /^status:\s*ON/m.test(raw);
  const pid = raw.match(/caffeinate pid\s+(\d+)/)?.[1];
  const line = (re: RegExp) => raw.match(re)?.[1]?.trim();

  return {
    on,
    pid,
    raw,
    sleepDisabled: line(/SleepDisabled\s+(\S+)/),
    sleep: line(/\bsleep\s+(.+)/),
    displaySleep: line(/displaysleep\s+(.+)/),
    diskSleep: line(/disksleep\s+(\S+)/),
  };
}

function toMarkdown(s: StatusData): string {
  if (s.on) {
    return [
      `# ☕ ON`,
      ``,
      `Mac stays awake with lid closed — even on battery.`,
      ``,
      s.pid ? `Running **caffeinate** (pid \`${s.pid}\`).` : "",
      ``,
      `## Power settings`,
      ``,
      `| Setting | Value |`,
      `| --- | --- |`,
      `| Sleep disabled | \`${s.sleepDisabled ?? "?"}\` |`,
      `| System sleep | \`${s.sleep ?? "?"}\` |`,
      `| Display sleep | \`${s.displaySleep ?? "?"}\` |`,
      `| Disk sleep | \`${s.diskSleep ?? "?"}\` |`,
      ``,
      `Run **Stop Keep Awake** when you're done.`,
    ].join("\n");
  }

  return [
    `# 💤 OFF`,
    ``,
    `Normal sleep is restored. Lid close / idle can sleep the Mac.`,
    ``,
    `## Power settings`,
    ``,
    `| Setting | Value |`,
    `| --- | --- |`,
    `| Sleep disabled | \`${s.sleepDisabled ?? "?"}\` |`,
    `| System sleep | \`${s.sleep ?? "?"}\` |`,
    `| Display sleep | \`${s.displaySleep ?? "?"}\` |`,
    `| Disk sleep | \`${s.diskSleep ?? "?"}\` |`,
    ``,
    `Run **Start Keep Awake** to keep it awake.`,
  ].join("\n");
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const raw = await getStatus();
      setData(parseStatus(raw));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      await showToast({
        style: Toast.Style.Failure,
        title: "Status failed",
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (error) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={`# Status failed\n\n\`\`\`\n${error}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={load} />
          </ActionPanel>
        }
      />
    );
  }

  const on = data?.on ?? false;

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? toMarkdown(data) : "Loading…"}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="State">
              <Detail.Metadata.TagList.Item
                text={on ? "ON" : "OFF"}
                color={on ? Color.Green : Color.SecondaryText}
              />
            </Detail.Metadata.TagList>
            {data.pid ? (
              <Detail.Metadata.Label title="caffeinate pid" text={data.pid} />
            ) : null}
            {data.sleepDisabled ? (
              <Detail.Metadata.Label
                title="SleepDisabled"
                text={data.sleepDisabled}
              />
            ) : null}
            {data.sleep ? (
              <Detail.Metadata.Label title="sleep" text={data.sleep} />
            ) : null}
            {data.displaySleep ? (
              <Detail.Metadata.Label
                title="displaysleep"
                text={data.displaySleep}
              />
            ) : null}
            {data.diskSleep ? (
              <Detail.Metadata.Label title="disksleep" text={data.diskSleep} />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
          {data ? (
            <Action.CopyToClipboard
              title="Copy Raw Status"
              content={data.raw}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
