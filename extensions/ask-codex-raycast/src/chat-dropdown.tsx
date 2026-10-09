import { Icon, List } from "@raycast/api";
import type { ModelSelection } from "./codex";
import type { Page } from "./history";
import type { ModelMenuProps } from "./model-menu";

function modelValue(selection: ModelSelection) {
  return `model:${JSON.stringify([selection.model, selection.effort])}`;
}

function modelLabel(selection: ModelSelection) {
  return [selection.model, selection.effort].filter(Boolean).join(" · ");
}

/** The same remembered selection as the Actions menu, in Raycast's native accessory. */
export function ChatDropdown(
  props: ModelMenuProps & { page: Page; onPageChange: (page: string) => void },
) {
  const choices = new Map<string, ModelSelection>();
  for (const model of props.models) {
    for (const effort of model.efforts.length ? model.efforts : [""]) {
      const selection = { model: model.model, effort };
      choices.set(modelValue(selection), selection);
    }
  }
  const selected = props.selection || props.current;
  const selectionValue = props.selection ? modelValue(selected) : "session";
  const unavailable = props.selection && !choices.has(selectionValue);

  return (
    <List.Dropdown
      tooltip="选择模型与智力档位，或管理会话 · 模型从下一次回复生效"
      value={props.page === "chat" ? selectionValue : `page:${props.page}`}
      storeValue={false}
      onChange={(value) => {
        const selection = choices.get(value);
        if (selection) props.onSelect(selection);
        else if (value === "session") props.onSelect(null);
        else if (value === "refresh") {
          if (props.ready && !props.loading) props.onRefresh();
        } else if (value.startsWith("page:"))
          props.onPageChange(value.slice(5));
      }}
    >
      <List.Dropdown.Section title="模型与智力档位">
        <List.Dropdown.Item
          title={`会话默认${modelLabel(props.current) ? ` · ${modelLabel(props.current)}` : ""}`}
          value="session"
          icon={Icon.Chip}
        />
        {unavailable && (
          <List.Dropdown.Item
            title={`${modelLabel(selected)} · 待确认可用性`}
            value={selectionValue}
            icon={Icon.Chip}
          />
        )}
      </List.Dropdown.Section>
      {props.models.map((model) => (
        <List.Dropdown.Section key={model.model} title={model.displayName}>
          {(model.efforts.length ? model.efforts : [""]).map((effort) => {
            const selection = { model: model.model, effort };
            return (
              <List.Dropdown.Item
                key={modelValue(selection)}
                title={modelLabel(selection)}
                value={modelValue(selection)}
                icon={Icon.Chip}
              />
            );
          })}
        </List.Dropdown.Section>
      ))}
      <List.Dropdown.Section title="会话">
        <List.Dropdown.Item
          title="当前会话"
          value="page:chat"
          icon={Icon.Message}
        />
        <List.Dropdown.Item
          title="历史会话"
          value="page:history"
          icon={Icon.Clock}
        />
        <List.Dropdown.Item
          title="已归档"
          value="page:archived"
          icon={Icon.Tray}
        />
        <List.Dropdown.Item
          title="本机 CLI 会话"
          value="page:cli"
          icon={Icon.Terminal}
        />
        <List.Dropdown.Item
          title="新建对话"
          value="page:new"
          icon={Icon.Plus}
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="模型列表">
        <List.Dropdown.Item
          title={
            props.loading
              ? "正在加载模型…"
              : props.error
                ? "加载失败，重新加载模型"
                : props.ready
                  ? "刷新模型列表"
                  : "连接后加载模型"
          }
          value="refresh"
          icon={Icon.ArrowClockwise}
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
