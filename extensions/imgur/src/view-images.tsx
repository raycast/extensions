import { Detail, Grid, LocalStorage, ActionPanel, Action, Icon, Toast, showToast } from "@raycast/api";
import { useMemo, useState } from "react";
import { StoreData, UploadResponse } from "./index";
import { writeFile } from "fs/promises";
import axios from "axios";
import { homedir } from "os";
import { join } from "path";

export default function Command() {
  const [term, setTerm] = useState<string>("");
  const { history, error, loading } = useHistory(term);

  if (error) return <Detail markdown={error} />;

  return (
    <Grid isLoading={loading} columns={4} onSearchTextChange={setTerm}>
      {history.map((item) => (
        <Grid.Item
          key={item.id}
          content={item.link}
          actions={
            <ActionPanel>
              <Action.Push title="Details" target={<MetaData {...item} />} icon={{ source: Icon.Info }} />
              <Download url={item.link} filename={item.title ?? ""} />
              <Action.OpenInBrowser url={item.link} />
              <Action.CopyToClipboard title="Copy Link" content={item.link} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

const useHistory = (term: string) => {
  const [history, setHistory] = useState<UploadResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useMemo(() => {
    const getHistory = async () => {
      const storageHistory: StoreData[] = JSON.parse((await LocalStorage.getItem("history")) || "[]");
      /**
       * Future update can group albums pictures
       * Workaround this to not break current history
       */
      const history = storageHistory.map((item) => ("album" in item ? item.images : item)).flat();

      if (!history) {
        setError("No history found");
        setLoading(false);
        return;
      }

      if (term) {
        const filtered = history.filter((item: UploadResponse) =>
          item.title?.toLowerCase().includes(term.toLowerCase())
        );
        setHistory(filtered);
        setLoading(false);
        return;
      }

      setHistory(history);
      setLoading(false);
    };

    getHistory();
  }, [term]);

  return { history, error, loading };
};

const MetaData = (item: UploadResponse) => {
  return (
    <Detail
      markdown={`![${item.title}](${item.link})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Filename" text={item?.title ?? "Untitled"} />
          <Detail.Metadata.Label title="MIME Type" text={item?.type} />
          <Detail.Metadata.Label title="Size" text={bytesToString(item?.size)} />
          <Detail.Metadata.Label title="Dimensions" text={`${item?.width}x${item?.height}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Uploaded" text={new Date(item?.datetime * 1000).toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Download url={item.link} filename={item.title ?? ""} />
          <Action.OpenInBrowser url={item.link} />
          <Action.CopyToClipboard title="Copy Link" content={item.link} />
        </ActionPanel>
      }
    />
  );
};

export const downloadMedia = async (url: string, filename: string) => {
  const path = join(homedir(), "Downloads", filename);

  try {
    const toast = await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");
    const response = await (await axios.get(url, { responseType: "arraybuffer" })).data;
    await writeFile(path, Buffer.from(response));
    toast.title = "Downloaded";
    toast.message = `${path}`;
    toast.style = Toast.Style.Success;
  } catch (error) {
    await showToast(Toast.Style.Failure, "Download failed", "Please try again");
  }
};

export const Download: React.FC<{ url: string; filename: string }> = ({ url, filename }) => {
  return (
    <Action
      title="Download"
      icon={{ source: Icon.Download }}
      onAction={() => {
        downloadMedia(url, filename);
      }}
    />
  );
};

const bytesToString = (bytes: number) =>
  bytes >= 1048576
    ? (bytes / 1048576).toFixed(1) + "MB"
    : bytes >= 1024
    ? (bytes / 1024).toFixed(1) + "KB"
    : bytes + "B";
