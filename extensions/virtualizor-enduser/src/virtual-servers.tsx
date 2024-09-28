import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { MessageResponse } from "./lib/types";
import { useState } from "react";
import generateBaseUrl from "./lib/utils/generate-base-url";
import { useVirtualizor } from "./lib/hooks";
import { ListVirtualServersResponse, VirtualServersInfoResponse } from "./lib/types/vps";

export default function VirtualServers() {
  const [action, setAction] = useState("");
  const [ID, setID] = useState<string | null>("");

  const { isLoading: isFetching, data, revalidate } = useVirtualizor<ListVirtualServersResponse>("listvs");
  const { isLoading: isDoingAction } = useVirtualizor<MessageResponse>(action, {
    params: {
      svs: ID || "",
      do: "1",
    },
    execute: Boolean(action) && Boolean(ID),
    async onWillExecute() {
      await showToast(Toast.Style.Animated, "PROCESSING", `${action} Server ${ID}`);
    },
    async onData(data) {
      await showToast(Toast.Style.Success, data.done.msg, data.output);
      setAction("");
      revalidate();
    },
    async onError() {
      setAction("");
    },
  });
  const isLoading = isFetching || isDoingAction;

  function getIcon(status: number) {
    let tintColor = undefined;
    switch (status) {
      case 0:
        tintColor = Color.Red;
        break;
      case 1:
        tintColor = Color.Green;
        break;

      default:
        break;
    }
    return { source: Icon.Dot, tintColor };
  }

  return (
    <List isLoading={isLoading} onSelectionChange={setID} searchBarPlaceholder="Search virtual server">
      {data &&
        Object.values(data.vs).map((vps) => (
          <List.Item
            key={vps.vpsid}
            id={vps.vpsid}
            icon={getIcon(vps.status)}
            title={vps.hostname}
            subtitle={Object.values(vps.ips).join(", ")}
            accessories={[{ icon: generateBaseUrl() + vps.distro }, { text: vps.email }]}
            actions={
              !isLoading && (
                <ActionPanel>
                  <Action.Push icon={Icon.Eye} title="View VPS Info" target={<ViewVPSInfo vpsid={vps.vpsid} />} />
                  <Action icon={Icon.Redo} title="Revalidate" onAction={revalidate} />
                  <ActionPanel.Section>
                    {vps.status !== 0 && (
                      <>
                        <Action
                          icon={{ source: Icon.Redo, tintColor: Color.Blue }}
                          title="Restart VPS"
                          onAction={() => setAction("restart")}
                        />
                        <Action
                          icon={{ source: Icon.Stop, tintColor: Color.Red }}
                          title="Stop VPS"
                          onAction={() => setAction("stop")}
                        />
                      </>
                    )}
                    {vps.status === 0 && (
                      <Action
                        icon={{ source: Icon.Play, tintColor: Color.Green }}
                        title="Start VPS"
                        onAction={() => setAction("start")}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              )
            }
          />
        ))}
    </List>
  );
}

function ViewVPSInfo({ vpsid }: { vpsid: string }) {
  const { isLoading, data } = useVirtualizor<VirtualServersInfoResponse>("vpsmanage", {
    params: {
      svs: vpsid,
    },
    execute: true,
  });
  const markdonw = "```" + JSON.stringify(data) + "```";
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdonw}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Flags">
              {Object.entries(data.info.flags).map(([flag, active]) => (
                <Detail.Metadata.TagList.Item key={flag} text={flag} color={active ? Color.Green : Color.Red} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
    />
  );
}
