import type { TaxonomyOption } from "@/core/metadata/taxonomy";

// 规整成只剩字母和数字：全角转半角、去掉重音、小写，再去掉空格和标点。
// Hip-Hop → hiphop，Lo-Fi → lofi，Café → cafe，ｈｉｐｈｏｐ → hiphop。
function compact(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

// 一个名字可被搜到的写法：原名，加上规整后的写法。
// & 要先换成 n / and 再规整（R&B → rnb、randb；Drum & Bass → drumnbass、drumandbass）：
// 顺序反过来，& 会被当成标点去掉，R&B 就成了 rb。
export function nameKeywords(name: string): string[] {
  const base = name.normalize("NFKC");
  const variants = base.includes("&") ? [base.replace(/&/g, "n"), base.replace(/&/g, "and")] : [base];
  return [...new Set([name, ...variants, ...variants.map(compact)])];
}

// Tag 选项可被搜到的写法：名字和用户自填的别名，各自展开成各种写法。
export function optionKeywords(option: TaxonomyOption): string[] {
  return [...new Set([option.name, ...(option.aliases ?? [])].flatMap(nameKeywords))];
}

const MONTH_LONG = new Intl.DateTimeFormat("en", { month: "long" });
const MONTH_SHORT = new Intl.DateTimeFormat("en", { month: "short" });

// 创建时间的搜索词：年份和英文月份（全称、缩写），输入 2025、June、Jun 都能搜到。
export function dateKeywords(ms: number): string[] {
  const date = new Date(ms);
  return [String(date.getFullYear()), MONTH_LONG.format(date), MONTH_SHORT.format(date)];
}

// 组合搜索：按空格拆词，每个词规整后都要出现在某一项的规整写法里，全部命中才算。
// 输入里的 & 也当 n，所以 r&b 和 rnb 搜到的一样。
// matchWord 先判断一个词（Key、BPM 这类要整词对上的）：返回 true / false 就以它为准，
// 返回 undefined 才按文字比。只剩标点的词忽略。
export function matchesSearch(
  terms: string[],
  query: string,
  matchWord?: (word: string) => boolean | undefined,
): boolean {
  const words = query.normalize("NFKC").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = terms.map(compact);
  return words.every((word) => {
    const decided = matchWord?.(word);
    if (decided !== undefined) return decided;
    const compacted = compact(word.replace(/&/g, "n"));
    return compacted === "" || haystack.some((term) => term.includes(compacted));
  });
}

/**
 * BPM 的搜索词：120、120bpm 是四舍五入后等于 120；90-100 是 90 到 100 之间（两端都算）。
 * 半速、倍速也算（140 也搜到 70 和 280）。不是这几种写法时返回 undefined，交给文字比较。
 * 只认三位数以内：四位数留给年份。
 */
export function bpmMatches(bpm: number | null, word: string): boolean | undefined {
  const lower = word.toLowerCase();
  const single = lower.match(/^(\d{1,3})(bpm)?$/);
  const range = lower.match(/^(\d{1,3})-(\d{1,3})$/);
  if (!single && !range) return undefined;
  if (bpm === null) return false;
  const candidates = [bpm, bpm * 2, bpm / 2];
  if (single) {
    const target = Number(single[1]);
    return candidates.some((value) => Math.round(value) === target);
  }
  const [low, high] = [Number(range![1]), Number(range![2])].sort((a, b) => a - b);
  return candidates.some((value) => value >= low && value <= high);
}

/**
 * 拍号的搜索词：3/4、6/8 这种写法要和最新 Set 的拍号整个对上（6/8 不算 6/4，开头的 0 不算数）。
 * 不是这种写法时返回 undefined，交给文字比较；没有拍号的项目不算命中。
 */
export function timeSignatureMatches(timeSignature: string | null, word: string): boolean | undefined {
  const match = word.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return undefined;
  if (timeSignature === null) return false;
  return `${Number(match[1])}/${Number(match[2])}` === timeSignature;
}
