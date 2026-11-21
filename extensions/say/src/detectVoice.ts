import { readFile } from "node:fs/promises";
import { AI, environment, showToast, Toast } from "@raycast/api";
import { detect, Detector } from "raycast-language-detector";
import { getVoices } from "./speech.js";

const offlineDetectors = [Detector.Franc, Detector.LanguageDetect, Detector.TinyLD];
const qualityRank = { premium: 2, enhanced: 1, standard: 0 };
const normalizeCode = (code: string) => code.replaceAll("_", "-").toLowerCase();

const standardLocale = (code: string) => {
  // The two macOS catalogs use yue-HK and zh_HK for the same Cantonese voices.
  if (/^(?:yue|zh-(?:hant-|hans-)?(?:hk|mo))(?:-|$)/.test(code)) return "zh";
  // Keep language, script and region. Dialect tags include en-scotland,
  // zh-CN-u-sd-cnsc (AVFoundation) and zh_CN_U_SD@sd=cnsc (say).
  return code.match(/^[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?(?=$|[-@])/)?.[0];
};

const detectWithAI = async (text: string) => {
  if (!environment.canAccess(AI)) return undefined;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Detecting language with Raycast AI…" }).catch(
    () => undefined,
  );
  try {
    return await detect(text, { detectors: [Detector.AI] });
  } catch {
    return undefined;
  } finally {
    await toast?.hide().catch(() => {});
  }
};

export const detectVoice = async (text: string, withAI: boolean, inputFile?: string) => {
  const content = inputFile ? await readFile(inputFile, "utf8") : text;
  if (!content.trim()) return undefined;

  try {
    const aiResult = withAI ? await detectWithAI(content) : undefined;
    const result = aiResult ?? (await detect(content, { detectors: offlineDetectors }));
    if (!result?.languageCode) return undefined;

    const code = standardLocale(normalizeCode(result.languageCode));
    if (!code) return undefined;
    const language = code.split("-")[0];
    const voices = (await getVoices()).filter((voice) => {
      const locale = normalizeCode(voice.languageCode);
      return voice.enabled !== false && locale.split("-")[0] === language && locale === standardLocale(locale);
    });
    const exact = voices.filter((v) => normalizeCode(v.languageCode) === code);
    const matches = exact.length ? exact : voices;
    const [voice] = matches.sort(
      (a, b) =>
        qualityRank[b.quality ?? "standard"] - qualityRank[a.quality ?? "standard"] ||
        Number(!!b.isSiri) - Number(!!a.isSiri) ||
        (b.siriVoiceNumber ?? 0) - (a.siriVoiceNumber ?? 0),
    );
    return voice?.identifier ?? voice?.name;
  } catch {
    // Leave voice selection to the system if detection or voice lookup fails.
    return undefined;
  }
};
