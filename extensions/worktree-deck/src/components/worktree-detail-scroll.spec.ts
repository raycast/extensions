import { describe, expect, it } from "vitest";

import {
  SCROLL_DETAIL_DOWN_SHORTCUT,
  SCROLL_DETAIL_UP_SHORTCUT,
  buildScrollableDetailMarkdown,
  resolveNextDetailScrollOffset,
  resolveSafeDetailScrollOffset,
} from "./worktree-detail-scroll";

const DETAIL_MARKDOWN = ["| 📝 | title |", "| --- | --- |", "| 🌿 | main |", "", "line 1", "line 2"].join("\n");
const DETAIL_MARKDOWN_WITH_BLANK_BODY_LINES = [
  "| 📝 | title |",
  "| --- | --- |",
  "| 🌿 | main |",
  "",
  "line 1",
  "",
  "",
  "line 2",
].join("\n");

describe("worktree detail scroll", () => {
  it("shift+上下を詳細スクロールのショートカットにする", () => {
    expect(SCROLL_DETAIL_UP_SHORTCUT).toEqual({ modifiers: ["shift"], key: "arrowUp" });
    expect(SCROLL_DETAIL_DOWN_SHORTCUT).toEqual({ modifiers: ["shift"], key: "arrowDown" });
  });

  it("詳細テーブル途中ではなく本文先頭へスクロールする", () => {
    expect(resolveSafeDetailScrollOffset(DETAIL_MARKDOWN, 1)).toBe(4);
  });

  it("上方向は本文先頭から概要へ戻る", () => {
    expect(resolveNextDetailScrollOffset({ markdown: DETAIL_MARKDOWN, currentOffset: 4, direction: "up" })).toBe(0);
  });

  it("本文内では1行ずつ進める", () => {
    expect(resolveNextDetailScrollOffset({ markdown: DETAIL_MARKDOWN, currentOffset: 4, direction: "down" })).toBe(5);
  });

  it("下方向は本文中の空白行を飛ばす", () => {
    expect(
      resolveNextDetailScrollOffset({
        markdown: DETAIL_MARKDOWN_WITH_BLANK_BODY_LINES,
        currentOffset: 4,
        direction: "down",
      }),
    ).toBe(7);
  });

  it("概要から本文へ移るときも本文先頭の空白行を飛ばす", () => {
    const markdown = ["| 📝 | title |", "| --- | --- |", "| 🌿 | main |", "", "", "line 1"].join("\n");

    expect(resolveNextDetailScrollOffset({ markdown, currentOffset: 0, direction: "down" })).toBe(5);
  });

  it("上方向は本文中の空白行を飛ばす", () => {
    expect(
      resolveNextDetailScrollOffset({
        markdown: DETAIL_MARKDOWN_WITH_BLANK_BODY_LINES,
        currentOffset: 7,
        direction: "up",
      }),
    ).toBe(4);
  });

  it("空白行の位置を指定された場合は次の本文行から表示する", () => {
    expect(buildScrollableDetailMarkdown(DETAIL_MARKDOWN_WITH_BLANK_BODY_LINES, 5)).toBe("line 2");
  });

  it("末尾の空白行には止まらない", () => {
    const markdown = ["line 1", "line 2", ""].join("\n");

    expect(resolveNextDetailScrollOffset({ markdown, currentOffset: 1, direction: "down" })).toBe(1);
  });

  it("スクロール位置を反映した Markdown を返す", () => {
    expect(buildScrollableDetailMarkdown(DETAIL_MARKDOWN, 4)).toBe(["line 1", "line 2"].join("\n"));
  });

  it("本文中の Markdown テーブル途中へスクロールしてもプレビュー用のヘッダーを残す", () => {
    const markdown = [
      "| 📝 | title |",
      "| --- | --- |",
      "| 🌿 | main |",
      "",
      "before",
      "| 依存 | 扱い | 挙動 |",
      "| --- | --- | --- |",
      "| git | ほぼ必須 | Git is required. |",
      "| gh | PR 作成時だけ必須 | GitHub CLI is required. |",
      "",
      "after",
    ].join("\n");

    expect(buildScrollableDetailMarkdown(markdown, 7)).toBe(
      [
        "| 依存 | 扱い | 挙動 |",
        "| --- | --- | --- |",
        "| git | ほぼ必須 | Git is required. |",
        "| gh | PR 作成時だけ必須 | GitHub CLI is required. |",
        "",
        "after",
      ].join("\n"),
    );
  });

  it("本文中の Markdown テーブル区切り行へスクロールした場合は先頭データ行から表示する", () => {
    const markdown = [
      "before",
      "| 依存 | 扱い | 挙動 |",
      "| --- | --- | --- |",
      "| git | ほぼ必須 | Git is required. |",
    ].join("\n");

    expect(buildScrollableDetailMarkdown(markdown, 2)).toBe(
      ["| 依存 | 扱い | 挙動 |", "| --- | --- | --- |", "| git | ほぼ必須 | Git is required. |"].join("\n"),
    );
  });

  it("外枠のない Markdown テーブル途中へスクロールしても表として表示する", () => {
    const markdown = [
      "before",
      "依存 | 扱い | 挙動",
      "--- | --- | ---",
      "git | ほぼ必須 | Git is required.",
      "gh | PR 作成時だけ必須 | GitHub CLI is required.",
      "",
      "after",
    ].join("\n");

    expect(buildScrollableDetailMarkdown(markdown, 4)).toBe(
      ["依存 | 扱い | 挙動", "--- | --- | ---", "gh | PR 作成時だけ必須 | GitHub CLI is required.", "", "after"].join(
        "\n",
      ),
    );
  });
});
