import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";

export function MessageComposer(props: {
  draft: string;
  busy: boolean;
  ready: boolean;
  onChange: (text: string) => void;
  onSend: (text: string) => Promise<boolean>;
}) {
  const ignoreOpeningReset = useRef(true);
  const [restored, setRestored] = useState(false);
  const [query, setQuery] = useState("");
  const message = restored ? props.draft : query;
  const preview = message.replace(/\s+/g, " ").slice(0, 90);
  return (
    <ActionPanel.Submenu
      title={props.busy ? "补充要求" : "输入消息"}
      icon={props.busy ? Icon.Plus : Icon.Pencil}
      shortcut={{ modifiers: [], key: "return" }}
      filtering={false}
      throttle={false}
      isLoading={!props.ready}
      onOpen={() => {
        ignoreOpeningReset.current = true;
        setQuery("");
        setRestored(Boolean(props.draft.trim()));
      }}
      onSearchTextChange={(text) => {
        // Native menus reset their search field when opening. Keep a saved
        // draft until the user types a replacement or explicitly clears it.
        if (ignoreOpeningReset.current && !text) {
          ignoreOpeningReset.current = false;
          return;
        }
        ignoreOpeningReset.current = false;
        setQuery(text);
        setRestored(false);
        // Closing a native menu also clears its search text. Keep the last
        // non-empty draft; an empty visible query can never send that old text.
        if (text) props.onChange(text);
      }}
    >
      <ActionPanel.Section
        title={preview ? `待发送 · ${preview}` : "输入消息，按 Enter 发送"}
      >
        <Action
          title={
            restored
              ? "发送已保存的草稿"
              : props.busy
                ? "发送补充要求"
                : "发送消息"
          }
          icon={Icon.ArrowRight}
          onAction={async () => {
            if (!message.trim()) {
              await showToast({
                style: Toast.Style.Failure,
                title: "先在输入框里输入消息",
              });
              return;
            }
            if (await props.onSend(message)) {
              setQuery("");
              setRestored(false);
            }
          }}
        />
        {props.draft.trim() && (
          <Action
            title="清空草稿"
            icon={Icon.Eraser}
            onAction={() => {
              setQuery("");
              setRestored(false);
              props.onChange("");
            }}
          />
        )}
        {restored && (
          <Action.CopyToClipboard
            title="复制草稿以继续编辑"
            content={props.draft}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
}
