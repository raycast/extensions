import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { getAllExtensions } from "../api.js";
import { sparseCheckoutAdd } from "../git.js";
import { ExtentionNameFolder } from "../types.js";

export default function ValidExtensions({
  forkedExtensionFolders,
  onPop,
}: {
  forkedExtensionFolders: string[];
  onPop: () => void;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [allExtensions, setAllExtension] = useCachedState<ExtentionNameFolder[]>("all-extensions", []);

  useEffect(() => {
    const foldersSet = new Set(forkedExtensionFolders);
    const loadAllExtensions = async () => {
      setIsLoading(true);
      const allExtensions = await getAllExtensions();
      const filteredExtensions = allExtensions.filter((x) => !foldersSet.has(x.folder));
      setAllExtension(filteredExtensions);
      setIsLoading(false);
    };
    loadAllExtensions();
  }, [forkedExtensionFolders]);

  const fork = async (extensionFolder: string) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Forking extension",
      });
      await sparseCheckoutAdd(extensionFolder);
      toast.style = Toast.Style.Success;
      toast.title = `Forked successfully`;
    } catch (error) {
      showFailureToast(error);
    }
  };

  return (
    <List isLoading={isLoading}>
      {allExtensions.map((x) => (
        <List.Item
          key={x.folder}
          title={x.folder}
          subtitle={x.name}
          keywords={[x.folder, x.name]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.NewDocument}
                title="Fork"
                onAction={async () => {
                  await fork(x.folder);
                  onPop();
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
