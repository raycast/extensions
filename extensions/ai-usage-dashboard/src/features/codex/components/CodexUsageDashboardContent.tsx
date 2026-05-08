import {
  Clipboard,
  Detail,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCodexUsageDashboardQuery } from "../hooks/useCodexUsageDashboardQuery/useCodexUsageDashboardQuery";
import { DashboardActions } from "../../common/components/DashboardActions";
import { UsageDashboardList } from "../../common/components/UsageDashboardList";
import { renderErrorMarkdown } from "../../common/lib/dashboardMarkdown/dashboardMarkdown";

const getErrorMarkdown = (error: unknown): string =>
  error &&
  typeof error === "object" &&
  "markdown" in error &&
  typeof error.markdown === "string"
    ? error.markdown
    : renderErrorMarkdown(error, "Codex Usage");

const getErrorRawJson = (error: unknown): string | undefined =>
  error &&
  typeof error === "object" &&
  "rawJson" in error &&
  typeof error.rawJson === "string"
    ? error.rawJson
    : undefined;

export const CodexUsageDashboardContent = () => {
  const query = useCodexUsageDashboardQuery();

  const copyRawJson = async () => {
    const rawJson = query.data?.rawJson ?? getErrorRawJson(query.error);

    if (!rawJson) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No JSON to copy",
      });
      return;
    }

    await Clipboard.copy(rawJson);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Codex JSON",
    });
  };

  const actions = (
    <DashboardActions
      onCopyRawJson={() => void copyRawJson()}
      onOpenPreferences={() => void openCommandPreferences()}
      onRefresh={() => void query.refetch()}
    />
  );

  if (query.isError && !query.data) {
    return (
      <Detail markdown={getErrorMarkdown(query.error)} actions={actions} />
    );
  }

  return (
    <UsageDashboardList
      actions={actions}
      data={query.data}
      isLoading={query.isPending || query.isFetching}
    />
  );
};
