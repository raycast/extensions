// Key 的写法和排序。Key 的格式是「根音 + 空格 + 音阶」，如 A Minor、C♯/D♭ Minor、D Dorian。

// 根音的打字写法：♯ 记作 #，♭ 记作 b，同音的两种都给（C♯/D♭ → c#、db；E♭ → eb、d#）。
const ROOT_SPELLINGS: Record<string, string[]> = {
  "C♯/D♭": ["c#", "db"],
  "E♭": ["eb", "d#"],
  "F♯/G♭": ["f#", "gb"],
  "A♭": ["ab", "g#"],
  "B♭": ["bb", "a#"],
};

// 大小调的常见简写；其他音阶只认全名。
const SCALE_SUFFIXES: Record<string, string[]> = {
  major: ["maj", " major"],
  minor: ["m", "min", " minor"],
};

function splitKey(key: string): { roots: string[]; scale: string } | null {
  const space = key.indexOf(" ");
  if (space < 0) return null;
  const root = key.slice(0, space);
  return { roots: ROOT_SPELLINGS[root] ?? [root.toLowerCase()], scale: key.slice(space + 1).toLowerCase() };
}

/**
 * 一个 Key 能被搜到的写法：根音 × 音阶简写，如 A Minor → am、amin、a minor。
 * 不给单独的根音（a、eb）：它会同时命中大调和小调，等于没搜。
 */
export function keyKeywords(key: string): string[] {
  const parts = splitKey(key);
  if (!parts) return [];
  const suffixes = SCALE_SUFFIXES[parts.scale] ?? [` ${parts.scale}`];
  return parts.roots.flatMap((root) => suffixes.map((suffix) => root + suffix));
}

/** 比较 Key 写法用：小写、♯ → #、♭ → b、去掉空格。C#m、c♯m、c# m 都成了 c#m。 */
export function keyToken(text: string): string {
  return text.toLowerCase().replace(/♯/g, "#").replace(/♭/g, "b").replace(/\s+/g, "");
}
