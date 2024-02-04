import { useEffect, useState } from "react";
import { List, Color, Icon, Toast, showToast } from "@raycast/api";
import { ProxmoxAPI } from "../utils/api/proxmox";
import { Storage } from "../interfaces/storage";
import { bytesToGBS } from "../utils/helpers/conversion";

export function ProxmoxStorage(): JSX.Element {
  const [storageList, setStorageList] = useState<Storage[]>();
  const [error, setError] = useState<Error>();
  const instance = new ProxmoxAPI();
  async function getStorage() {
    let st;
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Fetching storage",
      });
      st = await instance.getStorage();
    } catch (error) {
      setError(new Error("Failed to get storage", { cause: error }));
    }
    showToast({
      style: Toast.Style.Success,
      title: "Fetched storage",
    });
    setStorageList(st);
  }
  useEffect(() => {
    getStorage();
  }, []);
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={storageList === undefined && error === undefined}
      isShowingDetail={storageList !== undefined && storageList?.length !== 0}
      searchBarPlaceholder="Search name, type, content or node"
    >
      {error !== undefined ? (
        <List.EmptyView icon={Icon.Warning} title={error.message} description={`${error.cause}`} />
      ) : (
        <></>
      )}
      {storageList?.length === 0 ? (
        <List.EmptyView
          title="No Storage Found"
          description="Instance has no storage"
          icon={Icon.SpeechBubbleImportant}
        />
      ) : (
        storageList?.map((storage: Storage) => (
          <List.Item
            icon={{ source: "icons/storage.svg", tintColor: Color.PrimaryText }}
            key={`${storage.node}-${storage.name}`}
            title={storage.name}
            keywords={[`${storage.type}`, storage.node, ...storage.content.split(",")]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Enabled" text={`${storage.enabled}`} />
                    <List.Item.Detail.Metadata.Label title="Active" text={`${storage.active}`} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Type" text={storage.type} />
                    <List.Item.Detail.Metadata.TagList title="Content">
                      {storage.content
                        .split(",")
                        .sort()
                        .map((c: string) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={`${storage.node}-${storage.name}-${c}`}
                            text={c}
                          />
                        ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Shared" text={`${storage.shared}`} />
                    <List.Item.Detail.Metadata.Label
                      title="Node"
                      text={storage.node}
                      icon={{ source: "icons/node.svg", tintColor: Color.PrimaryText }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Storage Utilization"
                      text={`${Math.ceil(storage.utilization * 100)}% (${bytesToGBS(storage.used)} / ${bytesToGBS(storage.size)})`}
                      icon={{ source: "icons/disk.svg", tintColor: Color.PrimaryText }}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
