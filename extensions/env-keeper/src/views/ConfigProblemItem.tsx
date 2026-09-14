import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showInFinder } from "@raycast/api";
import { basename } from "node:path";
import { t } from "../i18n.js";
import type { ConfigLoadProblem } from "../services/storage.js";

/**
 * 配置文件读不出来时,列表顶部的提示条。
 *
 * 必须说清三件事:出了什么问题、原数据还在不在、怎么救回来。
 * 静默显示一个空列表是最坏的做法——用户会以为"我从没配过",
 * 然后重新添加、保存,把还留着原始数据的坏文件覆盖掉。
 *
 * 列表行只放一句短标题(英文放不下三件事),完整说明进 Enter 弹出的提示框:
 * 提示框正文自动换行,多长都装得下;主按钮直接开访达定位原文件。
 */
export function ConfigProblemItem({ problem }: { problem: ConfigLoadProblem }) {
  const name = basename(problem.backupPath);
  const isTooNew = problem.reason === "tooNew";
  const isUnreadable = problem.reason === "unreadable";

  // 三种情况要说清:读不出来(文件还在原位、检查权限)/ 坏了但已挪开(去修)/ 坏了且没挪开(修好前不会写入)
  const title = isUnreadable ? t("cfg.unreadableTitle") : isTooNew ? t("cfg.tooNewTitle") : t("cfg.corruptedTitle");
  const detail = isUnreadable
    ? t("cfg.unreadableDetail", { name })
    : !problem.quarantined
      ? t("cfg.notQuarantinedDetail", { name })
      : isTooNew
        ? t("cfg.tooNewDetail", {
            version: problem.fileVersion ?? "?",
            current: problem.currentVersion,
            name,
          })
        : t("cfg.corruptedDetail", { name });

  const showDetails = async () => {
    const openInFinder = await confirmAlert({
      title,
      message: detail,
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      primaryAction: { title: t("cfg.showBackup"), style: Alert.ActionStyle.Default },
      dismissAction: { title: t("cfg.close") },
    });
    if (openInFinder) await showInFinder(problem.backupPath);
  };

  return (
    <List.Item
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      title={title}
      subtitle={t("cfg.detailsHint")}
      actions={
        <ActionPanel>
          <Action title={t("cfg.showDetails")} icon={Icon.Info} onAction={showDetails} />
          <Action.ShowInFinder title={t("cfg.showBackup")} path={problem.backupPath} />
        </ActionPanel>
      }
    />
  );
}
