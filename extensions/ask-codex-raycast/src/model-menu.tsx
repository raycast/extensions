import { Action, ActionPanel, Icon } from "@raycast/api";
import type { CodexModel, ModelSelection } from "./codex";

export const MODEL_SELECTION_KEY = "ask-chatgpt.model-selection.v1";

export type ModelMenuProps = {
  models: CodexModel[];
  selection: ModelSelection | null;
  current: ModelSelection;
  loading: boolean;
  error: string;
  ready: boolean;
  onRefresh: () => void;
  onSelect: (selection: ModelSelection | null) => void;
};

export function ModelMenu(props: ModelMenuProps) {
  const selected = props.selection || props.current;
  const label = [selected.model, selected.effort].filter(Boolean).join(" · ");
  return (
    <ActionPanel.Submenu
      title={`模型：${label || "自动"}`}
      icon={Icon.Chip}
      shortcut={{
        modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
        key: "m",
      }}
      isLoading={props.loading}
      onOpen={() => {
        if (!props.models.length && !props.loading && props.ready)
          props.onRefresh();
      }}
    >
      <Action
        title="沿用当前会话模型"
        icon={!props.selection ? Icon.Checkmark : Icon.Circle}
        onAction={() => props.onSelect(null)}
      />
      {props.models.map((model) => (
        <ActionPanel.Section key={model.model} title={model.displayName}>
          {(model.efforts.length ? model.efforts : [""]).map((effort) => (
            <Action
              key={`${model.model}-${effort}`}
              title={[model.model, effort].filter(Boolean).join(" · ")}
              icon={
                selected.model === model.model && selected.effort === effort
                  ? Icon.Checkmark
                  : Icon.Chip
              }
              onAction={() => props.onSelect({ model: model.model, effort })}
            />
          ))}
        </ActionPanel.Section>
      ))}
      <ActionPanel.Section>
        <Action
          title={
            props.error
              ? "模型列表加载失败，重新加载"
              : props.ready
                ? "刷新模型列表"
                : "等待连接后加载模型"
          }
          icon={Icon.ArrowClockwise}
          onAction={props.onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
