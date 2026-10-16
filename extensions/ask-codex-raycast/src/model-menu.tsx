import { t } from "./i18n";
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
  shortcuts?: boolean;
  onRefresh: () => void;
  onSelect: (selection: ModelSelection | null) => void;
};

function RefreshModels(props: ModelMenuProps) {
  return (
    <Action
      title={
        props.error
          ? t("模型列表加载失败，重新加载")
          : props.ready
            ? t("刷新模型列表")
            : t("等待连接后加载模型")
      }
      icon={Icon.ArrowClockwise}
      onAction={props.onRefresh}
    />
  );
}

function loadOnOpen(props: ModelMenuProps) {
  if (!props.models.length && !props.loading && props.ready) props.onRefresh();
}

export function ModelMenu(props: ModelMenuProps) {
  const selected = props.selection || props.current;
  return (
    <ActionPanel.Submenu
      title={t("模型：{v0}", { v0: selected.model || t("自动") })}
      icon={Icon.ComputerChip}
      shortcut={
        props.shortcuts === false
          ? undefined
          : {
              modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
              key: "m",
            }
      }
      isLoading={props.loading}
      onOpen={() => loadOnOpen(props)}
    >
      <Action
        title={t("沿用当前会话模型")}
        icon={!props.selection ? Icon.Checkmark : Icon.Circle}
        onAction={() => props.onSelect(null)}
      />
      <ActionPanel.Section title={t("Model")}>
        {props.models.map((model) => (
          <Action
            key={model.model}
            title={model.model}
            icon={
              selected.model === model.model
                ? Icon.Checkmark
                : Icon.ComputerChip
            }
            onAction={() => {
              const effort = model.efforts.includes(selected.effort)
                ? selected.effort
                : model.efforts.includes(model.defaultEffort)
                  ? model.defaultEffort
                  : model.efforts[0] || "";
              props.onSelect({ model: model.model, effort });
            }}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <RefreshModels {...props} />
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}

const effortOrder = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
];
const progressIcons = [
  Icon.Circle,
  Icon.CircleProgress25,
  Icon.CircleProgress50,
  Icon.CircleProgress75,
  Icon.CircleProgress100,
];

export function EffortMenu(props: ModelMenuProps) {
  const selected = props.selection || props.current;
  const model = props.models.find((entry) => entry.model === selected.model);
  const efforts = [...(model?.efforts || [])].sort((a, b) => {
    const first = effortOrder.indexOf(a);
    const second = effortOrder.indexOf(b);
    // Unknown future values keep the relative order reported by the CLI.
    return (
      (first < 0 ? effortOrder.length : first) -
      (second < 0 ? effortOrder.length : second)
    );
  });
  return (
    <ActionPanel.Submenu
      title={`${t("Effort Level")}: ${selected.effort || t("自动")}`}
      icon={Icon.Gauge}
      isLoading={props.loading}
      onOpen={() => loadOnOpen(props)}
    >
      {model && efforts.length > 0 && (
        <ActionPanel.Section title={model.model}>
          {efforts.map((effort, index) => {
            // A discrete scale, not a draggable control: native ActionPanel
            // supports actions/submenus only. Preserve the CLI's exact labels.
            const scale = efforts
              .map((_, position) => (position === index ? "●" : "─"))
              .join("");
            const icon =
              progressIcons[
                Math.round(
                  (index * (progressIcons.length - 1)) /
                    Math.max(1, efforts.length - 1),
                )
              ];
            return (
              <Action
                key={effort}
                title={`${effort}  ${scale}`}
                icon={selected.effort === effort ? Icon.Checkmark : icon}
                onAction={() => props.onSelect({ model: model.model, effort })}
              />
            );
          })}
        </ActionPanel.Section>
      )}
      {model && !efforts.length && (
        <ActionPanel.Section
          title={t("This model does not expose an adjustable effort level.")}
        >
          <RefreshModels {...props} />
        </ActionPanel.Section>
      )}
      {(!model || efforts.length > 0) && (
        <ActionPanel.Section>
          <RefreshModels {...props} />
        </ActionPanel.Section>
      )}
    </ActionPanel.Submenu>
  );
}
