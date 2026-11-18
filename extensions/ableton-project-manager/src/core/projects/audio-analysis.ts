import { execFile } from "node:child_process";
import { ensureAudioPlayerBinary } from "@/core/audio/audio-player-path";

export type AudioAnalysis = {
  duration: number; // 秒
  rms: number; // 0..1，整体响度
  peak: number; // 0..1，峰值绝对值，用于算波峰因数
  centroid: number; // 0..1，频谱亮度；-1 表示无有效帧
  flux: number; // 0..1，spectral flux（活动量）；-1 表示 n/a
};

/**
 * 调用播放器二进制的 analyze 模式，返回音频的时长、RMS 与峰值。
 * 输出格式与 swift/AudioPlayer.swift 的 analyze 模式配对，修改字段要两边同步。
 */
export function analyzeAudio(audioPath: string): Promise<AudioAnalysis> {
  return new Promise((resolve, reject) => {
    const playerPath = ensureAudioPlayerBinary();

    execFile(playerPath, ["analyze", audioPath], { encoding: "utf8", timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as Partial<AudioAnalysis>;
        if (
          typeof parsed.duration !== "number" ||
          typeof parsed.rms !== "number" ||
          typeof parsed.peak !== "number" ||
          typeof parsed.centroid !== "number" ||
          typeof parsed.flux !== "number"
        ) {
          reject(new Error(`Unexpected analyze output: ${stdout.trim()}`));
          return;
        }
        resolve({
          duration: parsed.duration,
          rms: parsed.rms,
          peak: parsed.peak,
          centroid: parsed.centroid,
          flux: parsed.flux,
        });
      } catch (parseError) {
        reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
      }
    });
  });
}
