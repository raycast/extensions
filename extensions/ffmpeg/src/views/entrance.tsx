import { useEffect } from "react";
import { RootFileList } from "../components/rootFileList";
import { TipForLoading } from "../components/tipForLoading";
import { TipForSelectFile } from "../components/tipForSelectFile";
import { fileState$ } from "../managers/fileManager";
import { refreshSelectedFiles } from "../utils/fs";
import { TipForInstallFFmpeg } from "../components/tipForInstallFFmpeg";
import { isFFmpegInstalled } from "../utils/ffmpeg";

const ffmpegInstalled = isFFmpegInstalled();

export function Entrance() {
  const loading = fileState$.loading.use();
  const filePaths = fileState$.filePaths.use();
  useEffect(() => {
    refreshSelectedFiles();
  }, []);

  if (!ffmpegInstalled) {
    return <TipForInstallFFmpeg />;
  }

  if (loading) {
    return <TipForLoading />;
  }

  if (filePaths.length === 0) {
    return <TipForSelectFile />;
  }

  return <RootFileList />;
}
