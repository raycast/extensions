import { List, useNavigation } from "@raycast/api";
import * as path from "path";
import { useState } from "react";
import { FileList } from "../components/fileList";

export function WriteMetadata({ filePaths }: { filePaths: string[] }) {
  const { push } = useNavigation();
  const [selectFilePath] = useState<string>("");

  if (filePaths.length === 1 || selectFilePath) {
    const filePath = selectFilePath || filePaths[0];
    return (
      <List navigationTitle="FFmpeg">
        <List.Section title="basic">
          <List.Item title={path.basename(filePath)} subtitle={filePath} key={filePath} />;
        </List.Section>
      </List>
    );
  }

  return (
    <FileList
      filePaths={filePaths}
      onSelectFile={(filePath) => {
        push(<WriteMetadata filePaths={[filePath]} />);
      }}
    />
  );
}
