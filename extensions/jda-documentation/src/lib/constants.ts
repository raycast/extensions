export const CACHE_SCHEMA = "v2";

export const DOCS_BASE = "https://docs.jda.wiki/";

export const WIKI_BASE = "https://jda.wiki/";

export const SOURCE_REPOSITORY = "discord-jda/JDA";

export const REQUEST_TIMEOUT = 15000;

export function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT);
}
