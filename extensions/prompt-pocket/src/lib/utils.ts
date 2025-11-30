/**
 * テキストを指定した長さで切り詰める
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}

/**
 * 配列を一意な要素のみにする
 */
export function uniqueArray<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * 文字列が空かどうかをチェック
 */
export function isEmpty(str: string | undefined | null): boolean {
  return !str || str.trim().length === 0;
}
