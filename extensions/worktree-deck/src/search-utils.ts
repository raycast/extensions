/**
 * 検索入力のトークン情報
 */
export type SearchTerms = {
  raw: string;
  tokens: string[];
};

/**
 * アクション項目の検索情報
 */
export type ActionSearchItem = {
  id: "create-worktree" | "settings";
  title: string;
  keywords: string[];
};

/**
 * 検索入力をトリムしてトークン化する
 */
export function parseSearchTerms(input: string): SearchTerms {
  const raw = input.trim();
  if (!raw) {
    return { raw: "", tokens: [] };
  }
  const tokens = raw
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return { raw, tokens };
}

/**
 * 検索トークンが検索対象に含まれるか判定する
 */
export function matchesSearchTerms(haystack: string, terms: SearchTerms): boolean {
  if (terms.tokens.length === 0) {
    return true;
  }
  return terms.tokens.every((token) => haystack.includes(token));
}

/**
 * アクション項目の検索用文字列を組み立てる
 */
function buildActionSearchText(item: ActionSearchItem): string {
  return [item.title, ...item.keywords].join(" ").toLowerCase();
}

/**
 * 検索トークンでアクション項目を絞り込む
 */
export function filterActionItemsBySearchTerms(items: ActionSearchItem[], terms: SearchTerms): ActionSearchItem[] {
  return items.filter((item) => matchesSearchTerms(buildActionSearchText(item), terms));
}
