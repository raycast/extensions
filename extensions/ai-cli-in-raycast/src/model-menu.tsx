import { t } from "./i18n";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { CodexModel, ModelSelection } from "./codex";
import type { ComposerInputRef } from "./message-composer";

export const MODEL_SELECTION_KEY = "ask-chatgpt.model-selection.v1";

export type ModelMenuProps = {
  models: CodexModel[];
  selection: ModelSelection | null;
  current: ModelSelection;
  loading: boolean;
  error: string;
  ready: boolean;
  shortcuts?: boolean;
  allowCurrent?: boolean;
  onRefresh: () => void;
  onSelect: (selection: ModelSelection | null) => boolean | void;
  inputRef?: ComposerInputRef;
};

/** Retire native callbacks synchronously, before React removes their branches. */
function useInputChoice<T>() {
  const [state, setState] = useState<{ choice: T | null; epoch: number }>({
    choice: null,
    epoch: 0,
  });
  const lifecycle = useRef({
    mounted: true,
    epoch: 0,
    active: null as T | null,
  });
  useEffect(() => {
    const current = lifecycle.current;
    // Effect replay must create fresh callbacks, rather than revive old ones.
    if (!current.mounted) {
      current.mounted = true;
      setState({ choice: null, epoch: current.epoch });
    }
    return () => {
      current.mounted = false;
      current.epoch++;
      current.active = null;
    };
  }, []);
  const isCurrent = () =>
    lifecycle.current.mounted && lifecycle.current.epoch === state.epoch;
  return {
    choice: state.choice,
    isCurrent,
    isActive: () =>
      isCurrent() &&
      state.choice !== null &&
      lifecycle.current.active === state.choice,
    activate(choice: T) {
      if (!isCurrent()) return false;
      lifecycle.current.active = choice;
      setState({ choice, epoch: state.epoch });
      return true;
    },
    reset() {
      if (!isCurrent()) return false;
      lifecycle.current.epoch++;
      lifecycle.current.active = null;
      setState({ choice: null, epoch: lifecycle.current.epoch });
      return true;
    },
  };
}

/** A submenu keeps native message entry open after choosing an option. */
function SelectionChoice(props: {
  title: string;
  icon: Action.Props["icon"];
  autoFocus?: boolean;
  inputRef?: ComposerInputRef;
  active: boolean;
  canContinue: () => boolean;
  onChoose: () => boolean;
}) {
  if (!props.inputRef)
    return (
      <Action
        title={props.title}
        icon={props.icon}
        autoFocus={props.autoFocus}
        onAction={props.onChoose}
      />
    );
  return (
    <ActionPanel.Submenu
      title={
        props.active
          ? props.inputRef.current?.title || t("Enter Message")
          : props.title
      }
      icon={props.icon ?? undefined}
      autoFocus={props.autoFocus}
      filtering={false}
      throttle={false}
      onOpen={() => {
        const input = props.inputRef?.current;
        if (input && (props.active ? props.canContinue() : props.onChoose()))
          input.open();
      }}
      onSearchTextChange={(text) => {
        if (props.active && props.canContinue())
          props.inputRef?.current?.onSearchTextChange(text);
      }}
    >
      {props.active && props.canContinue()
        ? props.inputRef.current?.content()
        : null}
    </ActionPanel.Submenu>
  );
}

function RefreshModels(props: ModelMenuProps) {
  return (
    <Action
      title={
        props.loading
          ? t("Loading Models…")
          : props.error
            ? t("Reload Model List")
            : props.ready
              ? t("Refresh Model List")
              : t("Waiting for Connection")
      }
      icon={Icon.ArrowClockwise}
      onAction={() => loadOnOpen(props)}
    />
  );
}

function loadOnOpen(props: ModelMenuProps) {
  if (!props.loading && props.ready) props.onRefresh();
}

function catalogAvailable(props: ModelMenuProps): boolean {
  return props.ready && !props.loading && !props.error;
}

function catalogCaption(props: ModelMenuProps): string {
  return !props.ready
    ? t("Waiting for Connection")
    : props.loading
      ? t("Loading Models…")
      : props.error
        ? t("Model List Unavailable")
        : !props.models.length
          ? t("No Models Available")
          : "";
}

function CatalogStatus(props: ModelMenuProps) {
  return (
    <ActionPanel.Section
      title={props.error || catalogCaption(props) || undefined}
    >
      <RefreshModels {...props} />
    </ActionPanel.Section>
  );
}

export function ModelMenu(props: ModelMenuProps) {
  const latest = useRef(props);
  latest.current = props;
  const input = useInputChoice<{
    key: string;
    model?: CodexModel;
  }>();
  const inputChoice = input.choice;
  const selected = props.selection || props.current;
  const available = catalogAvailable(props);
  const caption = catalogCaption(props);
  // Keep the open message-entry branch mounted while a fresh catalog hides
  // all older selectable options, including when its model disappears.
  const entries = available ? [...props.models] : [];
  if (
    inputChoice?.model &&
    !entries.some((entry) => entry.model === inputChoice.model!.model)
  )
    entries.push(inputChoice.model);
  return (
    <ActionPanel.Submenu
      title={t("Model: {model}", {
        model:
          caption ||
          (selected.model === "__cli_default__"
            ? t("CLI Default")
            : selected.model || t("Choose a model")),
      })}
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
      onOpen={() => {
        if (input.reset()) loadOnOpen(latest.current);
      }}
    >
      {((available &&
        props.models.length > 0 &&
        props.allowCurrent !== false) ||
        inputChoice?.key === "current") && (
        <SelectionChoice
          title={t("Use Current Conversation Model")}
          icon={!props.selection ? Icon.Checkmark : Icon.Circle}
          inputRef={props.inputRef}
          active={inputChoice?.key === "current"}
          canContinue={input.isActive}
          onChoose={() => {
            const current = latest.current;
            if (
              input.isCurrent() &&
              catalogAvailable(current) &&
              current.models.length &&
              current.allowCurrent !== false
            ) {
              if (current.onSelect(null) === false) return false;
              return !current.inputRef || input.activate({ key: "current" });
            }
            return false;
          }}
        />
      )}
      {entries.length > 0 && (
        <ActionPanel.Section title={t("Model")}>
          {entries.map((model) => (
            <SelectionChoice
              key={model.model}
              title={
                model.model === "__cli_default__"
                  ? t("CLI Default")
                  : model.displayName || model.model
              }
              icon={
                selected.model === model.model
                  ? Icon.Checkmark
                  : Icon.ComputerChip
              }
              inputRef={props.inputRef}
              active={inputChoice?.key === model.model}
              canContinue={input.isActive}
              onChoose={() => {
                const current = latest.current;
                if (!input.isCurrent() || !catalogAvailable(current))
                  return false;
                const actual = current.models.find(
                  (entry) => entry.model === model.model,
                );
                if (!actual) return false;
                const selection = current.selection || current.current;
                const effort = actual.efforts.includes(selection.effort)
                  ? selection.effort
                  : actual.efforts.includes(actual.defaultEffort)
                    ? actual.defaultEffort
                    : actual.efforts[0] || "";
                if (current.onSelect({ model: actual.model, effort }) === false)
                  return false;
                return (
                  !current.inputRef ||
                  input.activate({ key: actual.model, model: actual })
                );
              }}
            />
          ))}
        </ActionPanel.Section>
      )}
      <CatalogStatus {...props} />
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
export function EffortMenu(props: ModelMenuProps) {
  const latest = useRef(props);
  latest.current = props;
  const input = useInputChoice<{
    key: string;
    model: string;
    effort: string;
  }>();
  const inputChoice = input.choice;
  const selected = props.selection || props.current;
  const model = props.models.find((entry) => entry.model === selected.model);
  const available = catalogAvailable(props);
  const caption = catalogCaption(props);
  const efforts = [...(model?.efforts || [])].sort((a, b) => {
    const first = effortOrder.indexOf(a);
    const second = effortOrder.indexOf(b);
    // Unknown future values keep the relative order reported by the CLI.
    return (
      (first < 0 ? effortOrder.length : first) -
      (second < 0 ? effortOrder.length : second)
    );
  });
  const entries =
    available && model
      ? efforts.map((effort) => ({
          key: `${model.model}:${effort}`,
          model: model.model,
          effort,
        }))
      : [];
  if (inputChoice && !entries.some((entry) => entry.key === inputChoice.key))
    entries.push(inputChoice);
  return (
    <ActionPanel.Submenu
      title={t("Effort Level: {effort}", {
        effort:
          caption ||
          (!model
            ? t("Choose a model")
            : !efforts.length
              ? t("Not adjustable")
              : efforts.includes(selected.effort)
                ? selected.effort
                : t("Choose an effort level")),
      })}
      icon={Icon.Gauge}
      shortcut={
        props.shortcuts === false
          ? undefined
          : {
              modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
              key: "e",
            }
      }
      isLoading={props.loading}
      onOpen={() => {
        if (input.reset()) loadOnOpen(latest.current);
      }}
    >
      {entries.length > 0 && (
        <ActionPanel.Section title={model?.model || inputChoice?.model}>
          {entries.map(({ key, model: modelId, effort }) => (
            <SelectionChoice
              key={key}
              title={effort}
              icon={selected.effort === effort ? Icon.Checkmark : Icon.Circle}
              autoFocus={selected.effort === effort}
              inputRef={props.inputRef}
              active={inputChoice?.key === key}
              canContinue={input.isActive}
              onChoose={() => {
                const current = latest.current;
                if (!input.isCurrent() || !catalogAvailable(current))
                  return false;
                const selection = current.selection || current.current;
                const actual = current.models.find(
                  (entry) => entry.model === selection.model,
                );
                if (
                  actual?.model === modelId &&
                  actual.efforts.includes(effort)
                ) {
                  if (
                    current.onSelect({ model: actual.model, effort }) === false
                  )
                    return false;
                  return (
                    !current.inputRef ||
                    input.activate({ key, model: actual.model, effort })
                  );
                }
                return false;
              }}
            />
          ))}
        </ActionPanel.Section>
      )}
      {available && model && !efforts.length && (
        <ActionPanel.Section
          title={t("This model does not expose an adjustable effort level.")}
        >
          <RefreshModels {...props} />
        </ActionPanel.Section>
      )}
      {(!available || !model || efforts.length > 0) && (
        <CatalogStatus {...props} />
      )}
    </ActionPanel.Submenu>
  );
}
