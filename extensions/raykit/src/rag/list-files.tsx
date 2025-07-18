import { useEffect, useState } from "react";
import {
  List,
  showToast,
  ToastStyle,
  ActionPanel,
  Action,
} from "@raycast/api";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("https://rag.petermsimon.com/files")
      .then((res) => res.json())
      .then((json) => setFiles(json.files || []))
      .catch(() =>
        showToast({ style: ToastStyle.Failure, title: "Failed to load files" })
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search indexed files">
      {files.map((file, idx) => (
        <List.Item
          key={idx}
          title={file}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={file} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
