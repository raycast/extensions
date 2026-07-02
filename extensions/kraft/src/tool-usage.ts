import { Record as HistoryRecord } from "./hooks/useHistory";
import { ToolDefinition } from "./tools";

export function getToolUsageCount(history: Pick<HistoryRecord, "mode">[] | undefined, tool: ToolDefinition) {
  if (!history || !tool.mode) {
    return 0;
  }

  return history.filter((record) => record.mode === tool.mode).length;
}

export function sortExecutionToolsByUsage<T extends ToolDefinition>(
  tools: T[],
  history: Pick<HistoryRecord, "mode">[] | undefined,
) {
  return tools
    .map((tool, index) => ({
      tool,
      index,
      usageCount: getToolUsageCount(history, tool),
    }))
    .sort((left, right) => right.usageCount - left.usageCount || left.index - right.index)
    .map(({ tool }) => tool);
}
