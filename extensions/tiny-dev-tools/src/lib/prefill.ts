/**
 * 输入自动预填 Hook：选中优先、剪贴板回退。
 * UI 层模块（依赖 @raycast/api），detector 纯函数在 pure.ts（Node 可直接导入，smoke 覆盖）。
 * 来源优先级理由：选区是当下意图的最精确信号；剪贴板是可靠性兜底（选区切应用易丢、
 * 且「复制→打开命令」是验收确认的主工作流）。两路过同一 detector，误判防线不变。
 * 取向：漏判优于误判（漏判退回手动粘贴=现状，误判多填一次可清空的输入）。
 *
 * DEBUG_PREFILL=1 时 Toast 显示来源诊断（selection/clipboard/none），用于排查预填不生效。
 */
import { useEffect, useState } from "react";
import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

export function usePrefill(detector: (text: string) => boolean): string | null {
  const [prefill, setPrefill] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let adopted: string | null = null;
      let source = "none";

      // 来源一：系统选中文本（需辅助功能权限，失败静默）
      try {
        const sel = (await getSelectedText()).trim();
        if (sel && detector(sel)) {
          adopted = sel;
          source = "selection";
        }
      } catch {
        /* 无选中文本或权限缺失：静默 */
      }

      // 来源二：剪贴板回退（Clipboard.read 无需辅助功能权限）
      if (adopted === null) {
        try {
          const clip = (await Clipboard.read()).text?.trim() ?? "";
          if (clip && detector(clip)) {
            adopted = clip;
            source = "clipboard";
          }
        } catch {
          /* clipboard unreadable: silent */
        }
      }

      if (adopted !== null && !cancelled) setPrefill(adopted);

      if (!cancelled && process.env.DEBUG_PREFILL === "1") {
        const detail = source === "none" ? "No match from either source" : `${source} · ${adopted!.slice(0, 30)}`;
        await showToast(Toast.Style.Animated, `prefill: ${source}`, detail);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return prefill;
}
