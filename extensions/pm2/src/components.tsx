import { ActionPanel, Action, Color, Icon, List, confirmAlert, Alert } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { formatDistance } from "date-fns";
import get from "lodash/get.js";
import { ProcessDescription } from "pm2";
import { getProcessStatusColor, getRaycastIcon, isRaycastNodeProcess, runPm2Command } from "./utils.js";
import { ExportedKey, Pm2Process } from "./types.js";

export const MetaData = ({ processDescription: p }: { processDescription: ProcessDescription }) => {
  const isRaycastProcess = isRaycastNodeProcess(p);
  const exportedKeys: ExportedKey[] = [
    { key: "name" },
    { key: "pm_id", render: (v) => String(v) },
    { key: "pid" },
    { key: "pm2_env.namespace" },
    { key: "pm2_env.version" },
    { key: "pm2_env.exec_mode" },
    {
      key: "pm2_env._",
      render: (v) => (isRaycastProcess ? "node" : String(v)),
      icon: isRaycastProcess ? getRaycastIcon() : undefined,
      title: "env._",
    },
    { key: "pm2_env.pm_pid_path" },
    { key: "pm2_env.pm_exec_path" },
    { key: "pm2_env.pm_uptime", render: (v) => formatDistance(new Date(v), new Date()) },
    { key: "pm2_env.username" },
    { key: "pm2_env.watch" },
  ];

  return (
    <List.Item.Detail.Metadata>
      {exportedKeys.map((item) => {
        const key = typeof item === "string" ? item : item.key;
        const value = get(p, key);
        return (
          value !== undefined && (
            <List.Item.Detail.Metadata.Label
              key={key}
              icon={typeof item === "string" ? undefined : item.icon}
              title={item.title ?? (key.split(".").at(-1) as string)}
              text={item.render?.(value) ?? String(value)}
            />
          )
        );
      })}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="status">
        {typeof p.pm2_env?.status === "string" && (
          <List.Item.Detail.Metadata.TagList.Item
            text={p.pm2_env?.status}
            color={getProcessStatusColor(p.pm2_env?.status)}
          />
        )}
        {typeof p.monit?.cpu === "number" && (
          <List.Item.Detail.Metadata.TagList.Item
            icon={getProgressIcon(p.monit.cpu / 100)}
            text={`CPU ${p.monit.cpu}%`}
            color={Color.Blue}
          />
        )}
        {typeof p.monit?.memory === "number" && (
          <List.Item.Detail.Metadata.TagList.Item
            text={`Memory ${Number.parseFloat((p.monit.memory / 1024 / 1000).toFixed(1))} MB`}
            color={Color.Blue}
          />
        )}
      </List.Item.Detail.Metadata.TagList>
    </List.Item.Detail.Metadata>
  );
};

export const ProcessActions = ({
  processDescription: p,
  onToggleDetail,
  onActionComplete,
}: {
  processDescription: ProcessDescription;
  onToggleDetail: () => void;
  onActionComplete: () => void;
}) => {
  const pmId = p.pm_id as Pm2Process;

  return (
    <>
      <Action icon={Icon.AppWindowSidebarRight} title="Toogle Detail" onAction={onToggleDetail} />
      <ActionPanel.Section>
        {p.pm2_env?.status !== "online" && (
          <Action
            icon={Icon.Play}
            title="Start"
            onAction={async () => {
              if (
                !isRaycastNodeProcess(p) &&
                (await confirmAlert({
                  title: "You are starting a non-Raycast process",
                  message:
                    "Start this process may miss some environment variables. Please consider start this process with PM2 CLI.",
                  primaryAction: { title: "Do Nothing" },
                  dismissAction: { title: "Start Anyway" },
                }))
              ) {
                return;
              }
              await runPm2Command("start", {
                name: get(p, "name"),
                script: get(p, "pm2_env.pm_exec_path"),
                pid: get(p, "pm2_env.pm_pid_path"),
              });
              onActionComplete();
            }}
          />
        )}
        {!["stopping", "stopped"].includes(p.pm2_env?.status || "") && (
          <Action
            icon={Icon.Stop}
            title="Stop"
            onAction={async () => {
              await runPm2Command("stop", pmId);
              onActionComplete();
            }}
          />
        )}

        <Action
          icon={Icon.Redo}
          title="Restart"
          onAction={async () => {
            await runPm2Command("restart", pmId);
            onActionComplete();
          }}
        />
        <Action
          icon={Icon.Repeat}
          title="Reload"
          onAction={async () => {
            await runPm2Command("reload", pmId);
            onActionComplete();
          }}
        />
        <Action
          icon={Icon.Trash}
          title="Delete"
          style={Action.Style.Destructive}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Delete PM2 instance",
                message: "Do you want to delete this PM2 instance",
                rememberUserChoice: true,
                primaryAction: {
                  style: Alert.ActionStyle.Destructive,
                  title: "Yes, delete it",
                },
              })
            ) {
              await runPm2Command("delete", pmId);
              onActionComplete();
            }
          }}
        />
      </ActionPanel.Section>
    </>
  );
};
