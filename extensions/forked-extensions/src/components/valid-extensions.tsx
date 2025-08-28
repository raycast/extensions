import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import * as api from "../api.js";
import operation from "../operation.js";
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
      const allExtensions = await api.getAllExtensions();
      const filteredExtensions = allExtensions.filter((x) => !foldersSet.has(x.folder));
      setAllExtension(filteredExtensions);
      setIsLoading(false);
    };
    loadAllExtensions();
  }, [forkedExtensionFolders]);

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
                  await operation.fork(x.folder);
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
