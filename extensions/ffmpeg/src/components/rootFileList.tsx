import { List } from "@raycast/api";
import * as path from "path";
import { useCallback, useMemo } from "react";
import { fileManager, fileState$ } from "../managers/fileManager";
import { ActionMenu } from "./actionMenu";
import { FileDetail } from "./fileDetail";

export function RootFileList() {
  const filePaths = fileState$.filePaths.use();

  const onSelect = useCallback((filePath: string | null) => {
    if (!filePath) {
      return;
    }

    fileState$.loading.set(true);
    fileManager.selectFile(filePath).finally(() => {
      fileState$.loading.set(false);
    });
  }, []);

  const $detail = useMemo(() => <FileDetail />, []);

  return (
    <List
      navigationTitle="FFmpeg"
      isShowingDetail={true}
      onSelectionChange={onSelect}
      throttle={false}
      filtering={true}
    >
      <List.Section title="Files">
        {filePaths.map((filePath) => {
          const filename = path.basename(filePath);
          return (
            <List.Item
              id={filePath}
              title={filename}
              // subtitle={filePath}
              key={filePath}
              quickLook={{ name: filename, path: filePath }}
              detail={$detail}
              actions={<ActionMenu />}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
