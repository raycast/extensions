import { LocalStorage } from "@raycast/api";
import path from "path";

export interface Configuration {
  model: string;
  pythonPath: string;
  pipPath: string;
  audioStoragePath: string;
  keepAudioFiles: boolean;
  pasteTranscription: boolean;
  audioExtension: "mp3" | "wav";
}

const DEFAULT_PYTHON_PATH = path.join(process.env.HOME!, ".pyenv/versions/3.11.3/bin");
const DEFAULT_TMP_DIR = process.env.TMPDIR || "/tmp";

export const DEFAULT_CONFIG: Configuration = {
  model: "small.en",
  pythonPath: path.join(DEFAULT_PYTHON_PATH, "python"),
  pipPath: path.join(DEFAULT_PYTHON_PATH, "pip"),
  audioStoragePath: DEFAULT_TMP_DIR,
  keepAudioFiles: false,
  pasteTranscription: true,
  audioExtension: "mp3",
};

export const getConfig = async (): Promise<Configuration> => {
  const configStr = await LocalStorage.getItem("whisperConfig");

  try {
    return configStr ? JSON.parse(configStr as string) : DEFAULT_CONFIG;
  } catch (error) {
    console.error("Error parsing config:", error);
    return DEFAULT_CONFIG;
  }
};

export const setConfig = async (config: Configuration) => {
  await LocalStorage.setItem("whisperConfig", JSON.stringify(config));
};
