import * as child_process from "child_process";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import * as googleTTS from "google-tts-api";
import * as os from "os";
import * as path from "path";

type TTSConfig = {
  lang: string;
  slow: boolean;
};

export async function playTTS(text: string, { lang, slow }: TTSConfig) {
  const base64 = await googleTTS.getAudioBase64(text, { lang, slow });

  const tempFilePath = path.join(os.tmpdir(), "translation.mp3");
  writeFileSync(tempFilePath, Buffer.from(base64, "base64"));

  const afplayProcess = child_process.spawn("afplay", [tempFilePath]);

  afplayProcess.on("exit", () => {
    if (existsSync(tempFilePath)) {
      unlinkSync(tempFilePath);
    }
  });

  afplayProcess.on("close", () => {
    if (existsSync(tempFilePath)) {
      unlinkSync(tempFilePath);
    }
  });

  return afplayProcess;
}
