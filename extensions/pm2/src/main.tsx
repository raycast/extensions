import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, confirmAlert, open } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import spawn from "nano-spawn";
import { ProcessDescription } from "pm2";
import { MetaData, ProcessActions } from "./components.js";
import {
  checkIfNeedSetup,
  getProcessStatusColor,
  getRaycastIcon,
  isRaycastNodeProcess,
  pm2WrapperExamplePath,
  pm2WrapperIndexPath,
  runPm2Command,
  setupEnv,
} from "./utils.js";

export default function Main() {
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [list, setList] = useState<ProcessDescription[]>([]);

  const loadList = async () => {
    await checkIfNeedSetup();
    setupEnv();
    const { stdout } = await spawn("node", [pm2WrapperIndexPath, "list"]);
    const parsedList = JSON.parse(stdout);
    setList(parsedList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadList();
  }, []);

  const startExampleAction = list.find((x) => x.name === "raycast-pm2-example") ? null : (
    <Action
      icon={Icon.GameController}
      title="Start Example Process"
      onAction={async () => {
        await runPm2Command("start", { script: pm2WrapperExamplePath, name: "raycast-pm2-example" });
        loadList();
        if (
          await confirmAlert({
            title: "Do you want to see the example in browser?",
          })
        ) {
          open("http://127.0.0.1:3000");
        }
      }}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      actions={!isLoading && <ActionPanel>{startExampleAction}</ActionPanel>}
    >
      {list.map((p, index) => {
        return (
          <List.Item
            key={index}
            title={p?.name ?? "UNTITLED"}
            accessories={[
              {
                icon: isRaycastNodeProcess(p) ? getRaycastIcon() : undefined,
                tag: { color: getProcessStatusColor(p.pm2_env?.status), value: p.pm2_env?.status },
              },
              !isShowingDetail && typeof p.monit?.cpu === "number"
                ? {
                    icon: getProgressIcon(p.monit.cpu / 100),
                    tag: { color: Color.Blue, value: `CPU ${p.monit.cpu}%` },
                  }
                : {},
              !isShowingDetail && typeof p.monit?.memory === "number"
                ? {
                    tag: {
                      color: Color.Blue,
                      value: `Memory ${Number.parseFloat((p.monit.memory / 1024 / 1000).toFixed(1))} MB`,
                    },
                  }
                : {},
            ]}
            detail={<List.Item.Detail metadata={<MetaData processDescription={p} />} />}
            actions={
              <ActionPanel>
                <ProcessActions
                  processDescription={p}
                  onToggleDetail={() => {
                    setIsShowingDetail(!isShowingDetail);
                  }}
                  onActionComplete={() => {
                    loadList();
                  }}
                />
                {startExampleAction}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
