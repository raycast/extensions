import { shortcuts } from "../lib/shortcuts";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import type { Post, Verified } from "@xeet/core";
import { randomUUID } from "node:crypto";
import { useRef, useState } from "react";
import { readAvatar } from "../lib/files";
import { getEngine, renderPost } from "../lib/renderer";
import { defaultOptions, lastOptions, saveOptions, settings, type Options } from "../lib/settings";
import { saveDraft } from "../lib/storage";
import AppearanceFields from "./appearance-fields";
import PostPreview from "./post-preview";

const countKeys = ["replies", "reposts", "likes", "views", "bookmarks"] as const;

function validateHandle(value?: string) {
  const handle = value?.trim().replace(/^@/, "");
  if (handle && !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return "Use a handle of 1–15 letters, numbers, or underscores.";
}

function validateCount(value?: string) {
  const count = value?.trim();
  if (count && (!/^\d+$/.test(count) || !Number.isSafeInteger(Number(count))))
    return "Use a non-negative whole number.";
}
interface Values {
  saveOnly?: boolean;
  text: string;
  name: string;
  handle: string;
  verified: string;
  avatar: string[];
  squareAvatar: boolean;
  replyToHandle: string;
  createdAt: Date | null;
  replies: string;
  reposts: string;
  likes: string;
  views: string;
  bookmarks: string;
}

function formValues(post?: Post): Values {
  const preferences = settings();
  return {
    text: post?.text || "",
    name: post?.author?.name ?? preferences.authorName ?? "",
    handle: post?.author?.handle ?? preferences.authorHandle ?? "",
    verified: post?.author?.verified || "none",
    avatar: [],
    squareAvatar: post?.author?.squareAvatar || false,
    replyToHandle: post?.replyToHandle || "",
    createdAt: post?.createdAt ? new Date(post.createdAt) : null,
    replies: String(post?.counts?.replies ?? ""),
    reposts: String(post?.counts?.reposts ?? ""),
    likes: String(post?.counts?.likes ?? ""),
    views: String(post?.counts?.views ?? ""),
    bookmarks: String(post?.counts?.bookmarks ?? ""),
  };
}

export default function PostForm({
  initialPost,
  initialOptions,
  draftId,
  navigationTitle,
}: {
  initialPost?: Post;
  initialOptions?: Options;
  draftId?: string;
  navigationTitle?: string;
}) {
  const [basePost, setBasePost] = useState(initialPost);
  const [options, setOptions] = useState(initialOptions || defaultOptions);
  const [busy, setBusy] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const savedId = useRef(draftId || randomUUID());
  const changedOptions = useRef(false);
  const { push } = useNavigation();
  const {
    values,
    itemProps,
    handleSubmit,
    reset: resetValues,
  } = useForm<Values>({
    initialValues: formValues(initialPost),
    onSubmit: (values) => submit(values, !!values.saveOnly),
    validation: {
      text: (text) => {
        if (!text?.trim() && !basePost?.media?.length && !basePost?.quote && !basePost?.poll)
          return "Write some post text before generating a preview.";
        try {
          getEngine().explain({ text: text ?? "" }, options);
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      },
      handle: validateHandle,
      replyToHandle: validateHandle,
      ...Object.fromEntries(countKeys.map((key) => [key, validateCount])),
    },
  });
  usePromise(lastOptions, [], {
    execute: !initialOptions,
    onData: (saved) => {
      if (!changedOptions.current) setOptions(saved);
    },
    failureToastOptions: { title: "Could Not Load Saved Appearance" },
  });
  const { data: report, error: reportError } = usePromise(
    async (text: string, options: Options) => getEngine().explain({ text }, options),
    [values.text, options],
    { onError: () => undefined },
  );

  async function toPost(values: Values): Promise<Post> {
    if (!values.text.trim() && !basePost?.media?.length && !basePost?.quote && !basePost?.poll)
      throw new Error("Write some post text before generating a preview.");
    const handle = values.handle.trim().replace(/^@/, "");
    if (handle && !/^[A-Za-z0-9_]{1,15}$/.test(handle))
      throw new Error("Use a handle of 1–15 letters, numbers, or underscores.");
    const replyToHandle = values.replyToHandle.trim().replace(/^@/, "");
    if (replyToHandle && !/^[A-Za-z0-9_]{1,15}$/.test(replyToHandle))
      throw new Error("The reply target must be a handle of 1–15 letters, numbers, or underscores.");
    const counts: Post["counts"] = {};
    for (const key of countKeys) {
      const value = values[key].trim();
      if (value && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))))
        throw new Error(`${key[0].toUpperCase() + key.slice(1)} must be a non-negative whole number.`);
      if (value) counts[key] = Number(value);
    }
    const post: Post = {
      ...basePost,
      text: values.text,
      author: {
        ...basePost?.author,
        name: values.name.trim(),
        handle,
        verified: values.verified as Verified,
        squareAvatar: values.squareAvatar,
        avatar: values.avatar[0]
          ? await readAvatar(values.avatar[0])
          : removeAvatar
            ? undefined
            : basePost?.author?.avatar,
      },
      counts,
      replyToHandle: replyToHandle || undefined,
      createdAt: values.createdAt?.toISOString(),
      now: basePost?.now || new Date().toISOString(),
    };
    getEngine().explain(post, options);
    return post;
  }

  async function submit(values: Values, saveOnly: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      changedOptions.current = true;
      const post = await toPost(values);
      if (saveOnly) {
        await saveDraft(post, options, savedId.current);
        await showToast({ style: Toast.Style.Success, title: "Draft Saved" });
      } else {
        const preview = await renderPost(post, options);
        await saveOptions(options);
        if (settings().saveHistory) {
          try {
            await saveDraft(post, options, savedId.current);
          } catch (error) {
            await showFailureToast(error, { title: "Preview Ready, but Draft Could Not Be Saved" });
          }
        }
        push(<PostPreview preview={preview} draftId={savedId.current} />);
      }
    } catch (error) {
      await showFailureToast(error, { title: saveOnly ? "Could Not Save Draft" : "Could Not Generate Preview" });
    } finally {
      setBusy(false);
    }
  }

  function reset(post?: Post) {
    setBasePost(post);
    resetValues(formValues(post));
    changedOptions.current = true;
    setRemoveAvatar(false);
    savedId.current = randomUUID();
    setOptions(defaultOptions());
  }

  return (
    <Form
      navigationTitle={navigationTitle}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Preview"
            icon={Icon.Image}
            onSubmit={(values: Values) => handleSubmit({ ...values, saveOnly: false })}
          />
          <Action.SubmitForm
            title="Save Draft"
            icon={Icon.Document}
            onSubmit={(values: Values) => handleSubmit({ ...values, saveOnly: true })}
          />
          <ActionPanel.Submenu title="Load Preset" icon={Icon.List}>
            <Action
              title="Product Announcement"
              icon={Icon.Megaphone}
              onAction={() =>
                reset({
                  text: "We shipped something new. 🚀\n\nBuilt with care, ready for you.\nhttps://example.com #BuildInPublic",
                })
              }
            />
            <Action
              title="Long Post"
              icon={Icon.Text}
              onAction={() =>
                reset({
                  text:
                    "A small idea, thoughtfully made.\n\n" +
                    "Good tools make room for the work that matters. ".repeat(18),
                })
              }
            />
          </ActionPanel.Submenu>
          <Action
            title="Reset Form"
            icon={Icon.ArrowCounterClockwise}
            shortcut={shortcuts.reset}
            onAction={() => reset()}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.text} title="Post" placeholder="What’s happening?" />
      <Form.Description
        title="Characters"
        text={
          reportError
            ? reportError.message
            : report
              ? `${report.length.weighted} / ${report.length.limit} weighted characters${report.length.weighted <= report.length.limit ? "" : " — exceeds the standard post limit"}${report.text.hasShowMore ? " · Show more in this layout" : ""}`
              : "Calculating weighted character count…"
        }
      />
      <Form.Separator />
      <Form.TextField {...itemProps.name} title="Display Name" placeholder="Your Name" />
      <Form.TextField {...itemProps.handle} title="Handle" placeholder="yourhandle" />
      <Form.FilePicker
        {...itemProps.avatar}
        title="Profile Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Choose a local PNG, JPEG, or WebP file smaller than 8 MB."
      />
      {basePost?.author?.avatar && (
        <Form.Checkbox
          id="removeAvatar"
          label="Remove existing profile image"
          value={removeAvatar}
          onChange={setRemoveAvatar}
        />
      )}
      <Form.Dropdown {...itemProps.verified} title="Verification">
        {(["none", "blue", "business", "government"] as const).map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value[0].toUpperCase() + value.slice(1)} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox {...itemProps.squareAvatar} label="Use a square avatar" />
      <Form.TextField {...itemProps.replyToHandle} title="Replying To" placeholder="Optional handle" />
      <Form.Separator />
      <AppearanceFields
        options={options}
        onChange={(value) => {
          changedOptions.current = true;
          setOptions(value);
        }}
      />
      <Form.Description
        title="Typography"
        text="Uses open Noto and STIX fonts. Letter shapes, line breaks, and emoji differ from X."
      />
      <Form.Separator />
      {countKeys.map((key) => (
        <Form.TextField
          key={key}
          {...itemProps[key]}
          title={key[0].toUpperCase() + key.slice(1)}
          placeholder="Optional"
        />
      ))}
      <Form.DatePicker {...itemProps.createdAt} title="Post Date" />
      {basePost && (basePost.media || basePost.quote || basePost.poll || basePost.links) && (
        <Form.Description
          title="Attachments"
          text="Existing media, quotes, polls, and link cards are preserved. Use Render X Post with JSON to edit them."
        />
      )}
    </Form>
  );
}
