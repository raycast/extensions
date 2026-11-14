import { t } from "./i18n";
import {
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  type Image,
} from "@raycast/api";
import { Fragment, useEffect, useRef, useState, type RefObject } from "react";

export type ComposerInput = {
  title: string;
  open: () => void;
  onSearchTextChange: (text: string) => void;
  content: () => ActionPanel.Submenu.Props["children"];
};
export type ComposerInputRef = RefObject<ComposerInput | null>;

export type ComposerProps = {
  draft: string;
  busy: boolean;
  canSteer: boolean;
  ready: boolean;
  onChange: (text: string) => void;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => Promise<void> | void;
  onRefreshModels?: () => void;
  controls?: ActionPanel.Submenu.Props["children"];
  inputRef?: ComposerInputRef;
  sendIcon?: Image.ImageLike;
};

/** A native input popover above the bottom-right action bar; chat stays visible. */
export function MessageComposer(props: ComposerProps) {
  const current = useRef(props);
  current.current = props;
  const revision = useRef(0);
  const openingReset = useRef(true);
  const query = useRef("");
  const restored = useRef(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [, refresh] = useState(0);
  const [controlsVersion, setControlsVersion] = useState(0);
  const handle = useRef<ComposerInput | null>(null);
  const update = () => refresh((value) => value + 1);
  useEffect(() => {
    mounted.current = true;
    if (props.inputRef) props.inputRef.current = handle.current;
    return () => {
      mounted.current = false;
      if (props.inputRef?.current === handle.current)
        props.inputRef.current = null;
    };
  }, []);

  const message = restored.current ? props.draft : query.current;
  const preview = Array.from(message.replace(/\s+/g, " "))
    .slice(0, 90)
    .join("");
  async function send() {
    if (!mounted.current || pending.current) return;
    const text = restored.current ? current.current.draft : query.current;
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Enter a message in the input field first"),
      });
      return;
    }
    const submittedRevision = revision.current;
    pending.current = true;
    try {
      if (await current.current.onSend(text)) {
        if (!mounted.current || revision.current !== submittedRevision) return;
        query.current = "";
        restored.current = false;
        update();
      }
    } catch (reason) {
      if (mounted.current)
        await showToast({
          style: Toast.Style.Failure,
          title: t("Failed to send"),
          message: reason instanceof Error ? reason.message : String(reason),
        });
    } finally {
      pending.current = false;
    }
  }

  function beginInput() {
    if (!mounted.current) return;
    revision.current++;
    openingReset.current = true;
    query.current = "";
    restored.current = Boolean(current.current.draft.trim());
    update();
  }
  function changeInput(text: string) {
    if (!mounted.current) return;
    // The host clears an uncontrolled submenu query on open and close.
    // Only explicit Clear Draft discards the persistent recovery copy.
    if (openingReset.current && !text) {
      openingReset.current = false;
      return;
    }
    openingReset.current = false;
    revision.current++;
    query.current = text;
    restored.current = false;
    if (text) current.current.onChange(text);
    update();
  }
  function content() {
    return (
      <>
        <ActionPanel.Section>
          <Action
            title={
              props.busy && !props.canSteer
                ? t("Wait for Response")
                : restored.current
                  ? t("Send Saved Draft: {preview}", { preview })
                  : props.busy
                    ? t("Send Instructions")
                    : t("Send Message")
            }
            icon={props.sendIcon || Icon.ArrowRight}
            onAction={send}
          />
        </ActionPanel.Section>
        <Fragment key={controlsVersion}>{props.controls}</Fragment>
        {props.busy && (
          <Action
            title={t("Stop Response")}
            icon={Icon.Stop}
            shortcut={{
              modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
              key: ".",
            }}
            onAction={() => current.current.onStop()}
          />
        )}
        {props.draft.trim() && (
          <ActionPanel.Section>
            <Action
              title={t("Clear Draft")}
              icon={Icon.Eraser}
              onAction={() => {
                revision.current++;
                query.current = "";
                restored.current = false;
                current.current.onChange("");
                update();
              }}
            />
            {restored.current && (
              <Action.CopyToClipboard
                title={t("Copy Draft to Continue Editing")}
                content={props.draft}
              />
            )}
          </ActionPanel.Section>
        )}
      </>
    );
  }
  const title = props.busy
    ? props.canSteer
      ? t("Add Instructions")
      : t("Write Next Message")
    : t("Enter Message");
  handle.current = {
    title,
    open: beginInput,
    onSearchTextChange: changeInput,
    content,
  };
  if (props.inputRef) props.inputRef.current = handle.current;
  return (
    <ActionPanel.Submenu
      title={title}
      icon={props.sendIcon || Icon.Pencil}
      shortcut={{ modifiers: [], key: "return" }}
      filtering={false}
      throttle={false}
      isLoading={!props.ready}
      onOpen={() => {
        beginInput();
        setControlsVersion((value) => value + 1);
        current.current.onRefreshModels?.();
      }}
      onSearchTextChange={changeInput}
    >
      {content()}
    </ActionPanel.Submenu>
  );
}
