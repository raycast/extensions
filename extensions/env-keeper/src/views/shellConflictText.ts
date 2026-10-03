import type { ShellConflict } from "@env-keeper/core";
import { t } from "../i18n.js";

export function conflictWhat(conflict: ShellConflict): string {
  return conflict.kind === "alias"
    ? t("st.conflictAlias", { name: conflict.name })
    : t("st.conflictVariable", { name: conflict.name });
}

export function conflictOthers(conflict: ShellConflict, selfId: string): string {
  return conflict.snippets
    .filter((x) => x.id !== selfId)
    .map((x) => x.name)
    .join("」「");
}

/** 站在某一段的角度描述一条冲突:跟谁重复、最后听谁的 */
export function describeConflict(conflict: ShellConflict, selfId: string): string {
  const what = conflictWhat(conflict);
  const others = conflictOthers(conflict, selfId);
  if (conflict.effectiveId === selfId) return t("st.conflictLineOnly", { what, others });
  const effective = conflict.snippets.find((x) => x.id === conflict.effectiveId)?.name ?? "";
  return t("st.conflictLine", { what, others, effective });
}
