import { shortcuts } from "../lib/shortcuts";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { Post, Report, Verified } from "@xeet/core";
import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { readAvatar } from "../lib/files";
import { getEngine, renderPost } from "../lib/renderer";
import { defaultOptions, lastOptions, saveOptions, settings, type Options } from "../lib/settings";
import { saveDraft } from "../lib/storage";
import AppearanceFields from "./appearance-fields";
import PostPreview from "./post-preview";

const countKeys = ["replies", "reposts", "likes", "views", "bookmarks"] as const;
interface Values {
  text: string;
  name: string;
  handle: string;
  verified: Verified;
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
}: {
  initialPost?: Post;
  initialOptions?: Options;
  draftId?: string;
}) {
  const [values, setValues] = useState(() => formValues(initialPost));
  const [basePost, setBasePost] = useState(initialPost);
  const [options, setOptions] = useState(initialOptions || defaultOptions);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report>();
  const [validation, setValidation] = useState<string>();
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const savedId = useRef(draftId || randomUUID());
  const changedOptions = useRef(false);
  const { push } = useNavigation();
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let active = true;
    if (!initialOptions)
      void lastOptions()
        .then((saved) => {
          if (active && !changedOptions.current) setOptions(saved);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initialOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setReport(getEngine().explain({ text: values.text }, options));
        setValidation(undefined);
      } catch (error) {
        setReport(undefined);
        setValidation(error instanceof Error ? error.message : String(error));
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [values.text, options]);

  async function toPost(): Promise<Post> {
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
        verified: values.verified,
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

  async function submit(saveOnly: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const post = await toPost();
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
    setValues(formValues(post));
    setRemoveAvatar(false);
    savedId.current = randomUUID();
    setOptions(defaultOptions());
  }

  return (
    <Form
      navigationTitle={initialPost ? "Edit Post" : "Create Post Preview"}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Preview" icon={Icon.Image} onSubmit={() => submit(false)} />
          <Action
            title="Save Draft"
            icon={Icon.Document}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
            onAction={() => submit(true)}
          />
          <ActionPanel.Submenu title="Load Preset" icon={Icon.List}>
            <Action
              title="Product Announcement"
              onAction={() =>
                reset({
                  text: "We shipped something new. 🚀\n\nBuilt with care, ready for you.\nhttps://example.com #BuildInPublic",
                })
              }
            />
            <Action
              title="Long Post"
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
      <Form.TextArea
        id="text"
        title="Post"
        placeholder="What’s happening?"
        value={values.text}
        onChange={(text) => set("text", text)}
        error={validation}
      />
      <Form.Description
        title="Characters"
        text={
          report
            ? `${report.length.weighted} / ${report.length.limit} weighted characters${report.length.weighted <= report.length.limit ? "" : " — exceeds the standard post limit"}${report.text.hasShowMore ? " · Show more in this layout" : ""}`
            : "Calculating weighted character count…"
        }
      />
      <Form.Separator />
      <Form.TextField id="name" title="Display Name" value={values.name} onChange={(name) => set("name", name)} />
      <Form.TextField
        id="handle"
        title="Handle"
        placeholder="yourhandle"
        value={values.handle}
        onChange={(handle) => set("handle", handle)}
      />
      <Form.FilePicker
        id="avatar"
        title="Profile Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={values.avatar}
        onChange={(avatar) => set("avatar", avatar)}
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
      <Form.Dropdown
        id="verified"
        title="Verification"
        value={values.verified}
        onChange={(verified) => set("verified", verified as Verified)}
      >
        {(["none", "blue", "business", "government"] as const).map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value[0].toUpperCase() + value.slice(1)} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="squareAvatar"
        label="Use a square avatar"
        value={values.squareAvatar}
        onChange={(value) => set("squareAvatar", value)}
      />
      <Form.TextField
        id="replyToHandle"
        title="Replying To"
        placeholder="Optional handle"
        value={values.replyToHandle}
        onChange={(value) => set("replyToHandle", value)}
      />
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
          id={key}
          title={key[0].toUpperCase() + key.slice(1)}
          placeholder="Optional"
          value={values[key]}
          onChange={(value) => set(key, value)}
        />
      ))}
      <Form.DatePicker
        id="createdAt"
        title="Post Date"
        value={values.createdAt}
        onChange={(date) => set("createdAt", date)}
      />
      {basePost && (basePost.media || basePost.quote || basePost.poll || basePost.links) && (
        <Form.Description
          title="Attachments"
          text="Existing media, quotes, polls, and link cards are preserved. Use Render X Post with JSON to edit them."
        />
      )}
    </Form>
  );
}
