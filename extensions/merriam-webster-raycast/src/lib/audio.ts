const NUMBER_PREFIX = /^[0-9]/;

export function audioSubdirectory(audioId: string) {
  if (audioId.startsWith("bix")) return "bix";
  if (audioId.startsWith("gg")) return "gg";
  if (NUMBER_PREFIX.test(audioId)) return "number";
  return audioId[0];
}
