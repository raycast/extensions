import { ActionPanel, Action, Icon, List, LocalStorage, Color, showToast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { PingJob, WakeData } from "./types";
import { wake } from "./lib/wol";
import CreateWakeDataForm from "./components/CreateWakeDataForm";
import { exec } from "child_process";

type State = {
  wakeDatasets: WakeData[];
  liveDatasets: boolean[];
  isLoading: boolean;
};

export default function Command() {
  const [state, setState] = useState<State>({
    wakeDatasets: [],
    liveDatasets: [],
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      const storeWakeDatasets = await LocalStorage.getItem<string>("wakeDatasets");
      if (!storeWakeDatasets) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const wakeDatasets: WakeData[] = JSON.parse(storeWakeDatasets);
        setState((previous) => ({ ...previous, wakeDatasets, isLoading: false }));
      } catch (e) {
        setState((previous) => ({ ...previous, wakeDatasets: [], isLoading: false }));
      }
    })();
  }, []);

  const [jobs, setJobs] = useState<PingJob[]>([]);

  useEffect(() => {
    const task = jobs.shift();
    // final execute means the task is done
    const final = () => setJobs([...jobs]);
    if (task) {
      // console.debug("pinging", task.ip, "index", task.index, "previousSameIpIndex", task.previousSameIpIndex)
      if (task.previousSameIpIndex !== undefined) {
        setState((previous) => {
          // prevent duplicate ip request more than once
          const liveDatasets = previous.liveDatasets;
          liveDatasets[task.index] = liveDatasets[task.previousSameIpIndex!];
          return { ...previous, liveDatasets: [...liveDatasets] };
        });
        final();
        return;
      }
      // https://serverfault.com/questions/200468/how-can-i-set-a-short-timeout-with-the-ping-command
      exec(`/sbin/ping -t 1 -c 1 ${task.ip}`, function (err, stdout) {
        if (err) {
          // console.debug(task.index, err)
          final();
          return;
        }
        setState((previous) => {
          const liveDatasets = previous.liveDatasets;
          liveDatasets[task.index] = stdout.includes("1 packets received");
          return { ...previous, liveDatasets: [...liveDatasets] };
        });
        final();
      });
    }
  }, [jobs, setJobs]);

  useEffect(() => {
    LocalStorage.setItem("wakeDatasets", JSON.stringify(state.wakeDatasets));

    const pingJobs: PingJob[] = [];
    state.wakeDatasets.forEach(async (wakeData, index) => {
      const liveDatasets = state.liveDatasets;
      if (!wakeData.ip) {
        liveDatasets[index] = false;
        setState((previous) => ({ ...previous, liveDatasets: [...liveDatasets] }));
        return;
      }
      for (let i = 0; i < index; i++) {
        if (state.wakeDatasets[i].ip === wakeData.ip) {
          pingJobs.push({ ip: wakeData.ip, index, previousSameIpIndex: i });
          return;
        }
      }
      pingJobs.push({ ip: wakeData.ip, index });
    });
    setJobs(pingJobs);
  }, [state.wakeDatasets]);

  const handleCreate = useCallback(
    (values: WakeData) => {
      const newWakeDatasets = [...state.wakeDatasets, { ...values }];
      setState((previous) => ({ ...previous, wakeDatasets: newWakeDatasets }));
    },
    [state.wakeDatasets, setState],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newWakeDatasets = [...state.wakeDatasets];
      newWakeDatasets.splice(index, 1);
      setState((previous) => ({ ...previous, wakeDatasets: newWakeDatasets }));
    },
    [state.wakeDatasets, setState],
  );

  function CreateWakeAction(props: { onCreate: (values: WakeData) => void }) {
    return (
      <Action.Push
        title="Add Wake Data"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<CreateWakeDataForm onCreate={props.onCreate} />}
      />
    );
  }

  return (
    <List isLoading={state.isLoading} isShowingDetail={state.wakeDatasets.length > 0}>
      <List.EmptyView
        title="No data found"
        actions={
          <ActionPanel>
            <CreateWakeAction onCreate={handleCreate} />
          </ActionPanel>
        }
      />
      {state.wakeDatasets.map((item, index) => (
        <List.Item
          key={item.name}
          icon={Icon.ComputerChip}
          title={item.name}
          keywords={[item.mac, item.name]}
          accessories={[
            {
              tag: {
                value: `status: ${(state.liveDatasets[index] && "online") || "offline"}`,
                color: state.liveDatasets[index] ? Color.Green : Color.Yellow,
              },
            },
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
              <Action.CopyToClipboard title="Copy Mac Address" content={item.mac} />
              <CreateWakeAction onCreate={handleCreate} />
              <Action
                title="Remove Wake Data"
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
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
