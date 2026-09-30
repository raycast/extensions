import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { diffEnvVariables, parseEnv, type Preset } from "@env-keeper/core";
import { t } from "../i18n.js";
import { diffBlock, envValueDisplayer, formatEnvContentMasked, formatEnvDiff } from "./diffFormat.js";

interface PresetDiffViewProps {
  preset: Preset;
  envFilename: string;
  currentContent: string;
  customSecrets?: string[];
  /**
   * apply:回答"套用这份方案,文件会怎样"(方向 文件 → 方案)
   * drift:回答"套用之后文件改了什么"(方向 方案 → 文件)
   * 两个方向互为镜像,同时摆出来只会让人看两遍同一件事,所以按场景只显示一个
   */
  mode: "apply" | "drift";
  /** apply 模式下提供:看完差异直接套用,不用退回去再找一次 */
  onApply?: () => Promise<void>;
}

/**
 * 方案与当前文件的差异。差异算法和排版**复用**两个历史页那一套(`diffFormat.ts`),
 * 只是喂进去的两份内容换了来源——用户不用重新学一种排版。
 */
export function PresetDiffView({
  preset,
  envFilename,
  currentContent,
  customSecrets,
  mode,
  onApply,
}: PresetDiffViewProps) {
  const { pop } = useNavigation();
  const [reveal, setReveal] = useState(false);
  const show = envValueDisplayer(customSecrets, reveal);

  const current = parseEnv(currentContent);
  const saved = parseEnv(preset.content);
  const vars = { file: envFilename, name: preset.name };

  const body =
    mode === "apply"
      ? diffBlock(
          t("ps.diffApplyHeading", vars),
          t("ps.diffApplyHint", vars),
          formatEnvDiff(diffEnvVariables(current, saved), show),
        )
      : diffBlock(
          t("ps.diffDriftHeading", vars),
          t("ps.diffDriftHint", vars),
          formatEnvDiff(diffEnvVariables(saved, current), show),
        );

  const contentText = formatEnvContentMasked(preset.content, customSecrets, reveal);
  const markdown = [
    body,
    "",
    "---",
    "",
    `### ${t("ps.diffContentHeading")}`,
    "",
    contentText.trim() ? `\`\`\`dotenv\n${contentText}\n\`\`\`` : t("ps.contentPreviewEmpty"),
  ].join("\n");

  return (
    <Detail
      navigationTitle={mode === "apply" ? t("ps.diffNavApply", vars) : t("ps.diffNavDrift", vars)}
      markdown={markdown}
      actions={
        <ActionPanel>
          {onApply && (
            <Action
              title={t("ps.actionApply", { file: envFilename })}
              icon={Icon.Replace}
              onAction={async () => {
                await onApply();
                pop();
              }}
            />
          )}
          <Action
            title={reveal ? t("ps.actionHide") : t("ps.actionReveal")}
            icon={reveal ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={() => setReveal((v) => !v)}
          />
          {/* 方案内容可能带明文密钥,不进 Raycast 的剪贴板历史 */}
          <Action.CopyToClipboard title={t("ps.actionCopy")} content={preset.content} concealed />
        </ActionPanel>
      }
    />
  );
}
