import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { WakeData } from "./types";
import { wake } from "./lib/wol";
import WakeDataForm from "./components/WakeDataForm";
import { exec } from "child_process";
import { useLocalStorage } from "@raycast/utils";

const Shortcut = Keyboard.Shortcut;

export default function Command() {
  const { value: devices = [], setValue: setDevices, isLoading } = useLocalStorage<WakeData[]>("wakeDatasets", []);
  const [pingMap, setPingMap] = useState<Map<string, boolean>>(new Map());

  const ping = useCallback(
    (ips: string[]) => {
      const ipSet = new Set(ips);
      const pp = (ip: string) =>
        new Promise<boolean>((resolve) => {
          // https://serverfault.com/questions/200468/how-can-i-set-a-short-timeout-with-the-ping-command
          exec(`/sbin/ping -t 1 -c 1 ${ip}`, function (err, stdout) {
            if (err) {
              resolve(false);
              return;
            }
            resolve(stdout.includes("1 packets received"));
          });
        });
      (async () => {
        const map = new Map<string, boolean>();
        for (const ip of ipSet) {
          const res = await pp(ip);
          map.set(ip, res);
        }
        setPingMap(map);
      })();
    },
    [pingMap],
  );

  useEffect(() => {
    if (!devices) {
      return;
    }
    const ips = devices.map((d) => d.ip);
    ping(ips);
  }, [devices]);

  const handleDelete = useCallback(
    (index: number) => {
      if (devices) {
        devices.splice(index, 1);
        setDevices([...devices]);
      }
    },
    [devices],
  );

  const handleUpdate = useCallback(
    (index: number, value: WakeData) => {
      devices[index] = value;
      setDevices([...devices]);
    },
    [devices],
  );

  const handleCreate = useCallback(
    (value: WakeData) => {
      setDevices([...devices, value]);
    },
    [devices],
  );

  return (
    <List isLoading={isLoading} isShowingDetail={devices.length > 0}>
      <List.EmptyView
        title="Add a new device"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Device"
              icon={Icon.Plus}
              shortcut={Shortcut.Common.New}
              target={<WakeDataForm upsert={handleCreate} />}
            />
          </ActionPanel>
        }
      />
      {devices.map((item, index) => (
        <List.Item
          key={index}
          icon={Icon.ComputerChip}
          title={item.name}
          keywords={[item.mac, item.name]}
          accessories={[
            pingMap.has(item.ip)
              ? {
                  tag: {
                    value: `status: ${(pingMap.get(item.ip) && "online") || "offline"}`,
                    color: pingMap.get(item.ip) ? Color.Green : Color.Yellow,
                  },
                }
              : { tag: "ping" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Wake"
                icon={Icon.Play}
                onAction={async () => {
                  wake(item.mac, { port: parseInt(item.port) });
                  await showToast({ title: "Order acknowledged", message: "For the Swarm" });
                }}
              />
              <Action.CopyToClipboard title="Copy MAC Address" content={item.mac} shortcut={Shortcut.Common.Copy} />
              <Action.Push
                title="Add Device"
                icon={Icon.Plus}
                shortcut={Shortcut.Common.New}
                target={<WakeDataForm upsert={handleCreate} />}
              />
              <Action.Push
                title="Modify Device"
                icon={Icon.CircleEllipsis}
                shortcut={Shortcut.Common.Edit}
                target={
                  <WakeDataForm
                    upsert={(v) => {
                      handleUpdate(index, v);
                    }}
                    initial={item}
                  />
                }
              />
              <Action
                title="Remove Device"
                style={Action.Style.Destructive}
                shortcut={Shortcut.Common.Remove}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                onAction={() => handleDelete(index)}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={item.name} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="MAC" text={item.mac} />
                  <List.Item.Detail.Metadata.Label title="IP" text={item.ip} />
                  <List.Item.Detail.Metadata.Label title="WOL Port" text={item.port} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
