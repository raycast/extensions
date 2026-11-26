export type AudioAnalysis = {
  duration: number; // 秒
  rms: number; // 0..1，整体响度
  peak: number; // 0..1，峰值绝对值，用于算波峰因数
  centroid: number; // 0..1，频谱亮度；-1 表示无有效帧
  flux: number; // 0..1，spectral flux（活动量）；-1 表示 n/a
};

// 分析时限由 Swift 自己按音频时长算，到点抛错，不再靠这里单方面超时。
// 20 分钟的 WAV 实测 28 秒，约每秒音频 0.023 秒；0.05 留一倍余量。
// 同时会跑 3 个分析，所以上限不能太高，否则长文件一起卡住列表。
const ANALYZE_MIN_SECONDS = 30;
const ANALYZE_MAX_SECONDS = 120;
const ANALYZE_SECONDS_PER_AUDIO_SECOND = 0.05;

/**
 * 调用 Swift 的 analyzeAudio，返回音频的时长、RMS 与峰值。
 * 返回字段与 swift/audio-player/Sources/AudioPlayer.swift 的 AudioAnalysis 配对，修改字段要两边同步。
 * 三个时限参数也是跨语言约定，改一边要同步另一边。
 */
export async function analyzeAudio(audioPath: string): Promise<AudioAnalysis> {
  const { analyzeAudio: analyzeAudioInSwift } = await import("swift:../../../swift/audio-player");

  // 兜底：只管 Swift 打不开文件、卡在第一块这种自己抛不出错的情况。
  // 正常超时由 Swift 自己抛错，时限比 Swift 的上限多 10 秒。
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => reject(new Error("Audio analysis timed out.")), (ANALYZE_MAX_SECONDS + 10) * 1000);
  });

  try {
    const parsed = (await Promise.race([
      analyzeAudioInSwift(audioPath, ANALYZE_MIN_SECONDS, ANALYZE_MAX_SECONDS, ANALYZE_SECONDS_PER_AUDIO_SECOND),
      timeout,
    ])) as Partial<AudioAnalysis> | null;
    if (
      !parsed ||
      typeof parsed.duration !== "number" ||
      typeof parsed.rms !== "number" ||
      typeof parsed.peak !== "number" ||
      typeof parsed.centroid !== "number" ||
      typeof parsed.flux !== "number"
    ) {
      throw new Error(`Unexpected analyze output: ${JSON.stringify(parsed)}`);
    }
    return {
      duration: parsed.duration,
      rms: parsed.rms,
      peak: parsed.peak,
      centroid: parsed.centroid,
      flux: parsed.flux,
    };
  } finally {
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
    }
  }
}
