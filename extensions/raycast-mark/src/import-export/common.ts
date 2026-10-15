import { t } from "../i18n.ts";
import { LibraryError } from "../model.ts";
import type { LibraryState } from "../model.ts";

export function ready(state: LibraryState) {
  if (state.status !== "ready")
    throw new LibraryError(
      state.status === "blocked" ? "CORRUPT" : "CONFLICT",
      t("仅可对已验证且无冲突的库导入或完整导出"),
    );
}
