import {
  type EnvDiffEntry,
  type ShellSnippetDiffEntry,
  isEncryptedValue,
  isSecretKey,
  maskSecret,
  parseEnv,
} from "@env-keeper/core";
import { t } from "../i18n.js";

/**
 * 差异区的文案。两个历史页(项目轨快照 / Shell 配置历史)共用同一套写法。
 *
 * 两条原则:
 * - **方向写进标题,不留解释空间**。原先只有一段"与当前版本的差异",
 *   读的人无从判断"新增"说的是快照多了一项还是当前多了一项。现在一律写成
 *   `A → B`,条目描述的永远是"从 A 到 B 发生了什么"。
 * - **不用 markdown 列表**。`- ` 会被 Raycast 渲染成主题色圆点,红色在界面里
 *   通常意味着错误,而这里只是普通信息。彩色 emoji 仍然保留——markdown 正文
 *   没法上色,那是唯一能带颜色信号的办法。
 */

/** 一段有方向的差异:标题 + 说明 + 正文。标题自己带方向(`A → B`),说明解释这个方向在问什么 */
export function diffBlock(heading: string, hint: string, body: string): string {
  return [`### ${heading}`, "", `_${hint}_`, "", body].join("\n");
}

/** 两个历史页共用的两段:上一版 → 此版本、此版本 → 当前版本 */
export function diffSection(headingKey: "fromPrev" | "toCurrent", body: string): string {
  const heading = headingKey === "fromPrev" ? t("diff.fromPrevHeading") : t("diff.toCurrentHeading");
  const hint = headingKey === "fromPrev" ? t("diff.fromPrevHint") : t("diff.toCurrentHint");
  return diffBlock(heading, hint, body);
}

/**
 * 按"变量名是否敏感"决定一个值怎么显示。所有展示 .env 内容的地方都该走这一个函数,
 * 免得再出现"启用区打码、禁用区明文"这种漏网
 */
export function envValueDisplayer(
  customSecrets: string[] | undefined,
  reveal = false,
): (key: string, value: string) => string {
  return (key, value) => {
    if (reveal) return value;
    return isSecretKey(key, customSecrets, value) || isEncryptedValue(value) ? maskSecret(value) : value;
  };
}

/**
 * 把一份 .env 文本渲染成可以放进 markdown 代码块的样子:
 * 注释行、空行原样保留(比结构化展示更贴近原文),只把敏感值打码
 */
export function formatEnvContentMasked(content: string, customSecrets: string[] | undefined, reveal = false): string {
  const show = envValueDisplayer(customSecrets, reveal);
  return parseEnv(content)
    .map((line) => {
      if (line.type !== "kv") return line.raw.trimEnd();
      return `${line.disabled ? "# " : ""}${line.key}=${show(line.key, line.value)}`;
    })
    .join("\n");
}

export function formatEnvDiff(entries: EnvDiffEntry[], displayValue: (key: string, value: string) => string): string {
  const changed = entries.filter((e) => e.type !== "unchanged");
  if (changed.length === 0) return t("diff.none");

  return changed
    .map((e) => {
      if (e.type === "added") {
        const disabledNote = e.targetDisabled ? ` ${t("diff.addedDisabled")}` : "";
        return `${t("diff.added")} \`${e.key}\` = \`${displayValue(e.key, e.targetValue ?? "")}\`${disabledNote}`;
      }
      if (e.type === "removed") {
        return `${t("diff.removed")} \`${e.key}\`（${t("diff.originalValue")} \`${displayValue(e.key, e.baseValue ?? "")}\`）`;
      }

      // 值和启用状态可能同时变,两句都要说清楚
      const parts: string[] = [];
      if (e.baseValue !== e.targetValue) {
        parts.push(`\`${displayValue(e.key, e.baseValue ?? "")}\` → \`${displayValue(e.key, e.targetValue ?? "")}\``);
      }
      if (e.baseDisabled !== e.targetDisabled) {
        parts.push(e.targetDisabled ? t("diff.turnedOff") : t("diff.turnedOn"));
      }
      if ((e.baseComment ?? "") !== (e.targetComment ?? "")) {
        parts.push(t("diff.commentChanged", { from: e.baseComment ?? "-", to: e.targetComment ?? "-" }));
      }
      return `${t("diff.changed")} \`${e.key}\`：${parts.join("，")}`;
    })
    .join("\n\n");
}

export function formatShellDiff(entries: ShellSnippetDiffEntry[]): string {
  const changed = entries.filter((e) => e.type !== "unchanged");
  if (changed.length === 0) return t("diff.none");

  return changed
    .map((e) => {
      if (e.type === "added") return `${t("diff.added")} \`${e.name}\``;
      if (e.type === "removed") return `${t("diff.removed")} \`${e.name}\``;
      const renamed = e.previousName ? ` ${t("diff.renamed", { name: e.previousName })}` : "";
      return `${t("diff.changed")} \`${e.name}\`${renamed}`;
    })
    .join("\n\n");
}
