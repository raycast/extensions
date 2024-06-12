import { Action, Icon, Toast, showInFinder, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { messaging } from "../messaging";
import { usePreferences } from "../usePreferences";
import { useFetch } from "@raycast/utils";
import { SearchResult } from "../useSearch";
import path from "node:path";
import fs from "node:fs/promises";

function onDownloadError(name: string) {
  showToast({
    title: messaging.TOAST_DOWNLOAD_ERROR,
    message: name,
    style: Toast.Style.Failure,
  });
}

function onDownloading(name: string) {
  showToast({
    title: messaging.TOAST_DOWNLOAD_LOADING,
    message: name,
    style: Toast.Style.Animated,
  });
}

function onDownloadSuccess(name: string) {
  showToast({
    title: messaging.TOAST_DOWNLOAD_SUCCESS,
    message: name,
    style: Toast.Style.Success,
  });
}

interface DownloadActionProps {
  name: SearchResult["name"];
  imageUrl: SearchResult["image_url"];
}

const DownloadAction = ({ name, imageUrl }: DownloadActionProps) => {
  const [isDownloadRequested, setIsDownloadRequested] = useState(false);
  const { downloadDirectory: saveDir } = usePreferences();
  const { data, isLoading, error } = useFetch(imageUrl, {
    parseResponse: async (response: Response) => new Uint8Array(await response.arrayBuffer()),
    execute: isDownloadRequested,
  });

  const filename = imageUrl.split("/").pop()?.split("?")[0];

  const savePath = path.join(saveDir, filename ?? "");

  const handleSaveError = useCallback(() => {
    onDownloadError(name);
    setIsDownloadRequested(false);
  }, [name]);

  const handleSaveSuccess = useCallback(() => {
    onDownloadSuccess(name);
    setIsDownloadRequested(false);
    showInFinder(savePath);
  }, [name, savePath]);

  useEffect(() => {
    if (isLoading) {
      onDownloading(name);
    }
  }, [isLoading, name]);

  useEffect(() => {
    if (error) {
      onDownloadError(name);
    }
  }, [error, name]);

  useEffect(() => {
    if (!data || !data.length || !isDownloadRequested) return;

    onDownloading(name);

    fs.writeFile(savePath, Buffer.from(data), "binary").catch(handleSaveError).then(handleSaveSuccess);
  }, [data, isDownloadRequested, savePath, name, handleSaveError, handleSaveSuccess]);

  const handleAction = useCallback(() => {
    setIsDownloadRequested(true);
  }, []);

  return <Action title={messaging.ACTION_DOWNLOAD} onAction={handleAction} icon={Icon.Download} />;
};

export { DownloadAction };
