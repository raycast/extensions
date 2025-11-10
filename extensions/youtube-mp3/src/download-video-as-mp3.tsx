import {
  Action,
  ActionPanel,
  Form,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  Icon,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { exec, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import os from "os";

interface Preferences {
  ytdlPath?: string;
  locale?: string;
}

export default function Command() {
  const { ytdlPath: ytdlPathPreference, locale } = getPreferenceValues<Preferences>();
  const lang = locale || Intl.DateTimeFormat().resolvedOptions().locale;
  const isPT = lang.toLowerCase().startsWith("pt");

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState("");
  const [filePickerKey, setFilePickerKey] = useState(0);

  const isWindows = os.platform() === "win32";
  const isMac = os.platform() === "darwin";

  const isYouTubeUrl = (urlString: string) => {
    if (!urlString) return false;
    try {
      const url = new URL(urlString);
      return url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be");
    } catch {
      return urlString.includes("youtube.com") || urlString.includes("youtu.be");
    }
  };

  const getytdlPath = () => {
    if (ytdlPathPreference && fs.existsSync(ytdlPathPreference)) return ytdlPathPreference;
    try {
      const defaultPath = isMac
        ? "/opt/homebrew/bin/yt-dlp"
        : isWindows
          ? execSync("where yt-dlp").toString().trim().split("\n")[0]
          : "/usr/bin/yt-dlp";
      if (fs.existsSync(defaultPath)) return defaultPath;
    } catch {
      //
    }
    return "";
  };

  const ytdlPath = useMemo(() => getytdlPath(), [ytdlPathPreference]);
  const missingExecutable = useMemo(() => (!fs.existsSync(ytdlPath) ? "yt-dlp" : ""), [ytdlPath]);

  useEffect(() => {
    (async () => {
      try {
        const savedDir = await LocalStorage.getItem<string>("lastOutputDir");

        if (savedDir && fs.existsSync(savedDir)) {
          setOutputDir(savedDir);
        } else if (savedDir) {
          await LocalStorage.removeItem("lastOutputDir");
        }
      } catch (error) {
        console.error("Erro ao carregar preferências:", error);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!outputDir) {
        await LocalStorage.removeItem("lastOutputDir");
        setFilePickerKey((k) => k + 1);
        return;
      }

      if (fs.existsSync(outputDir)) {
        await LocalStorage.setItem("lastOutputDir", outputDir);
      } else {
        await LocalStorage.removeItem("lastOutputDir");
        setOutputDir("");
        setFilePickerKey((k) => k + 1);
      }
    })();
  }, [outputDir]);

  useEffect(() => {
    if (!url || !isYouTubeUrl(url) || !fs.existsSync(ytdlPath)) {
      setTitle(null);
      return;
    }

    const fetchTitle = async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isPT ? "Obtendo título..." : "Fetching title...",
      });

      exec(`${ytdlPath} --get-title --no-playlist "${url}"`, (error, stdout) => {
        toast.hide();
        if (error || !stdout?.trim()) {
          setTitle(null);
          return;
        }
        setTitle(stdout.trim());
      });
    };

    fetchTitle();
  }, [url, ytdlPath, isPT]);

  const handleDownload = async () => {
    if (missingExecutable) {
      await showHUD(
        isPT
          ? "yt-dlp não encontrado! Configure o caminho nas preferências."
          : "yt-dlp not found! Set the path in preferences.",
      );
      return;
    }

    if (!url) {
      await showHUD(isPT ? "Cole o link do vídeo!" : "Paste the video link!");
      return;
    }

    if (!outputDir || !fs.existsSync(outputDir)) {
      await showHUD(isPT ? "Selecione uma pasta válida!" : "Select a valid folder!");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: title || (isPT ? "Baixando MP3..." : "Downloading MP3..."),
      message: "0%",
    });

    const outputTemplate = path.join(outputDir, "%(title)s.%(ext)s");
    const command = `${ytdlPath} --no-playlist -x --audio-format mp3 --audio-quality 320k -o "${outputTemplate}" "${url}"`;

    const process = exec(command);

    process.stdout?.on("data", (data) => {
      const match = data.toString().match(/(\d{1,3}\.\d)%/);
      if (match) {
        toast.message = `${match[1]}%`;
      }
    });

    process.on("exit", async (code) => {
      if (code === 0) {
        toast.style = Toast.Style.Success;
        toast.title = isPT ? "Download concluído!" : "Download complete!";
        toast.message = isPT ? "MP3 salvo!" : "MP3 saved!";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = isPT ? "Erro no download" : "Download failed";
      }
    });
  };

  return (
    <Form
      key={filePickerKey}
      navigationTitle={isPT ? "Baixar Vídeo como MP3" : "Download Video as MP3"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Download}
            title={isPT ? "Baixar MP3" : "Download MP3"}
            onSubmit={handleDownload}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={isPT ? "Título" : "Title"}
        text={
          title ??
          (isYouTubeUrl(url)
            ? isPT
              ? "Obtendo título..."
              : "Fetching title..."
            : isPT
              ? "Cole o link do vídeo abaixo"
              : "Paste the video link below")
        }
      />

      <Form.TextField
        id="url"
        title={isPT ? "Link do Vídeo" : "Video Link"}
        placeholder="https://www.youtube.com/watch?v=..."
        value={url}
        onChange={setUrl}
        autoFocus
      />

      <Form.Description
        title={isPT ? "Qualidade do Áudio" : "Audio Quality"}
        text={isPT ? "320 kbps (Máxima qualidade)" : "320 kbps (Highest quality)"}
      />

      <Form.FilePicker
        key={`picker-${filePickerKey}`}
        id="outputDir"
        title={isPT ? "Pasta de Destino" : "Destination Folder"}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        value={outputDir ? [outputDir] : []}
        onChange={(files) => {
          const newDir = files[0] || "";
          setOutputDir(newDir);
        }}
      />

      <Form.Description
        text={isPT ? "A pasta selecionada é salva automaticamente." : "The selected folder is saved automatically."}
      />
    </Form>
  );
}
