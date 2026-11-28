import { Video } from "../types.js";

// Videos with more than one soundtrack (YouTube's dubbed audio tracks): which
// languages the link offers, and how the pick reaches yt-dlp's format selector.

export type AudioLanguage = { code: string; title: string; original: boolean };

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** A language code as yt-dlp lists it (`de-DE`, `hi`): nothing that could break out of a format filter. */
const isCode = (code: unknown): code is string => typeof code === "string" && /^[A-Za-z0-9-]{2,20}$/.test(code);

/**
 * The soundtracks to choose from, the original first, or none when the video
 * has a single one. Read from the audio-only formats: those are the ones a
 * language can be picked for. The original is the track the site marks as
 * preferred, else the language the video says it is spoken in; when neither
 * tells, no choice is offered and yt-dlp takes the site's default.
 */
export function audioLanguages(video: Video): AudioLanguage[] {
  const preference = new Map<string, number>();
  for (const format of video.formats ?? []) {
    const audioOnly = format.vcodec === "none" && !!format.acodec && format.acodec !== "none";
    if (!audioOnly || !isCode(format.language)) continue;
    const rank = typeof format.language_preference === "number" ? format.language_preference : 0;
    preference.set(format.language, Math.max(preference.get(format.language) ?? -Infinity, rank));
  }
  if (preference.size < 2) return [];
  const codes = [...preference.keys()];
  const top = Math.max(...preference.values());
  const preferred = codes.filter((code) => preference.get(code) === top);
  const original =
    preferred.length === 1
      ? preferred[0]
      : (codes.find((code) => code === video.language) ??
        codes.find((code) => code.split("-")[0] === video.language?.split("-")[0]));
  // Without knowing which one the site plays by default, there's no honest "original" to start the choice at.
  if (!original) return [];
  return codes
    .map((code) => ({ code, title: languageName(code), original: code === original }))
    .sort((a, b) => Number(b.original) - Number(a.original) || a.title.localeCompare(b.title));
}

/**
 * `selector` with its audio streams limited to `code`. Alternatives without an
 * audio stream of their own (`best[height<=720]`, a file with picture and
 * sound in one) are dropped: they carry the site's default soundtrack, and the
 * download would quietly be in another language than the one picked. A
 * selector with no audio stream to limit is returned as it is.
 */
export function withAudioLanguage(selector: string, code: string): string {
  if (!isCode(code)) return selector;
  const limited = selector
    .split("/")
    .filter((alternative) => /(best|worst)audio/.test(alternative))
    .map((alternative) => alternative.replace(/(best|worst)audio/g, `$&[language=${code}]`));
  return limited.length > 0 ? limited.join("/") : selector;
}

/** True when `selector` has an audio stream of its own, so a soundtrack can be picked for it. */
export function takesAudioLanguage(selector: string): boolean {
  return /(best|worst)audio/.test(selector);
}

/** What a dubbed download adds to its file name, so it doesn't replace the original: ` [German (Germany)]`. */
export function languageSuffix(language: AudioLanguage): string {
  return ` [${language.title.replace(/[<>:"/\\|?*%]/g, "").trim()}]`;
}
