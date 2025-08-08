import { useEffect, useState } from "react";
import {
  List,
  Action,
  ActionPanel,
  showToast,
  ToastStyle,
  Detail,
} from "@raycast/api";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://rag.petermsimon.com/files")
      .then((res) => res.json())
      .then((json) => setFiles(json.files || []))
      .catch(() =>
        showToast({ style: ToastStyle.Failure, title: "Failed to fetch file list" })
      );
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    setLoading(true);
    fetch("https://rag.petermsimon.com/summarize?file=" + encodeURIComponent(selectedFile))
      .then((res) => res.json())
      .then((json) => setSummary(json.summary || ""))
      .catch(() =>
        showToast({ style: ToastStyle.Failure, title: "Failed to summarize file" })
      )
      .finally(() => setLoading(false));
  }, [selectedFile]);

  return (
    <List
      isLoading={loading}
      isShowingDetail={!!summary}
      onSelectionChange={setSelectedFile}
      searchBarPlaceholder="Select a file to summarize"
    >
      {files.map((file, idx) => (
        <List.Item
          key={idx}
          title={file}
          detail={summary && selectedFile === file ? <List.Item.Detail markdown={summary} /> : undefined}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={summary || ""} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
