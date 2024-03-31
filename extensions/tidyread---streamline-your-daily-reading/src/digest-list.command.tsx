import {
  Action,
  showToast,
  Toast,
  Icon,
  List,
  launchCommand,
  LaunchType,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Digest } from "./types";
import {
  // clearLastNotifyTime,
  getDigests,
  saveDigests,
} from "./store";
import DigestDetail from "./components/DigestDetail";
import DigestListItem from "./components/DigestListItem";
import SharableLinkAction from "./components/SharableLinkAction";
import CustomActionPanel from "./components/CustomActionPanel";
import RedirectRoute from "./components/RedirectRoute";

export default function DigestList() {
  const [digests, setDigests] = useState<Digest[]>();

  useEffect(() => {
    loadDigests();
  }, []);

  const loadDigests = async () => {
    const items = await getDigests();
    setDigests(items.sort((a, b) => b.createAt - a.createAt));
  };

  const handleDelete = async (itemToDelete: Digest) => {
    const updatedItems = digests!.filter((item) => item.id !== itemToDelete.id);
    setDigests(updatedItems);
    await saveDigests(updatedItems);
    showToast(Toast.Style.Success, "Digest deleted");
  };

  const handleDeleteAll = async () => {
    setDigests([]);
    await saveDigests([]);
    showToast(Toast.Style.Success, "Digests all deleted");
  };

  // for debug
  // const debugActionNode = (
  //   <Action
  //     icon={Icon.Trash}
  //     title="Clear Last Notify Time"
  //     onAction={async () => {
  //       await clearLastNotifyTime();
  //       showToast(Toast.Style.Success, "Last notify time cleared");
  //     }}
  //   />
  // );

  return (
    <RedirectRoute>
      <List isLoading={!digests}>
        {digests?.length === 0 ? (
          <List.EmptyView
            actions={
              <CustomActionPanel>
                <Action
                  icon={Icon.ArrowRight}
                  title="Go to Daily Read"
                  onAction={() => {
                    launchCommand({ name: "daily-read.command", type: LaunchType.UserInitiated });
                  }}
                />
                {/* {debugActionNode} */}
              </CustomActionPanel>
            }
            title="No Digest Found"
            description="Go to 'Daily Read' View to generate digest."
          />
        ) : (
          (digests || []).map((digest, index) => {
            return (
              <DigestListItem
                key={index}
                digest={digest}
                itemProps={{
                  actions: (
                    <CustomActionPanel>
                      <Action.Push icon={Icon.Eye} title="View Detail" target={<DigestDetail digest={digest} />} />
                      <SharableLinkAction
                        actionTitle="Share This Digest"
                        articleTitle={digest.title}
                        articleContent={digest.content}
                      />
                      <Action
                        style={Action.Style.Destructive}
                        icon={Icon.Trash}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        title="Delete Digest"
                        onAction={async () => {
                          const flag = await confirmAlert({
                            title: "Delete Digest",
                            icon: Icon.Trash,
                            primaryAction: {
                              style: Alert.ActionStyle.Destructive,
                              title: "Delete",
                            },
                            message: "Confirm delete the digest permanently?",
                          });
                          if (flag) {
                            handleDelete(digest);
                          }
                        }}
                      />
                      <Action
                        style={Action.Style.Destructive}
                        icon={Icon.Trash}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        title="Delete All Digests"
                        onAction={async () => {
                          const flag = await confirmAlert({
                            title: "Delete All Digests",
                            icon: Icon.Trash,
                            primaryAction: {
                              style: Alert.ActionStyle.Destructive,
                              title: "Delete",
                            },
                            message: "Confirm delete all digests permanently?",
                          });
                          if (flag) {
                            handleDeleteAll();
                          }
                        }}
                      />
                      {/* {debugActionNode} */}
                    </CustomActionPanel>
                  ),
                }}
              />
            );
          })
        )}
      </List>
    </RedirectRoute>
  );
}
