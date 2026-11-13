/**
 * Google Meetの会議URLに、イベント所属カレンダーのアカウントを authuser クエリで付与する。
 * ブラウザが複数Googleアカウントにログインしていても、その予定のアカウントで開けるようにするため。
 * Google以外のホスト（Zoom/Teams等）は認証機構が異なるためそのまま返す。
 * コピー用途には使わない（他人に共有するURLへ自分のメールを混ぜないため、開く直前のみ適用する）。
 *
 * 依存ゼロの独立モジュールにしてある（meeting-url.test.ts が node:test で直接importするため）。
 */
export function withAuthUser(
  meetingUrl: string,
  accountEmail?: string,
): string {
  if (!accountEmail) {
    return meetingUrl;
  }
  try {
    const url = new URL(meetingUrl);
    if (url.hostname.toLowerCase() === "meet.google.com") {
      url.searchParams.set("authuser", accountEmail);
      return url.toString();
    }
  } catch {
    // 不正URLはそのまま返す（呼び出し側は検証済みのはずだが防御的に）
  }
  return meetingUrl;
}
