import {
  Action,
  ActionPanel,
  confirmAlert,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import {
  APP_LINKS,
  createPosts,
  isAuthError,
  isPostable,
  isVideoFile,
  listConnections,
  SUPPORTED_EXTENSIONS,
  uploadFile,
  validateMediaFile,
} from "./lib/api";
import { API_KEY_HINT, describeError, showErrorToast } from "./lib/errors";
import { firstLine, formatWhen } from "./lib/format";
import {
  connectionLabel,
  DESCRIPTION_PLATFORMS,
  MEDIA_REQUIRED_PLATFORMS,
  OPTIONAL_TITLE_PLATFORMS,
  platformIcon,
  platformName,
  TITLE_PLATFORMS,
  VIDEO_ONLY_PLATFORMS,
} from "./lib/platforms";
import { POST_STATUS, PUBLISH_MODE, type Connection, type Platform, type PostTarget } from "./lib/types";

const WHEN = { Now: "now", Schedule: "schedule" } as const;

/** POST /posts takes at most 10 targets per call. */
const MAX_TARGETS = 10;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

interface FormValues {
  caption: string;
  accounts: string[];
  media: string[];
  title: string;
  when: string;
  scheduledFor: Date | null;
}

export default function CreatePost() {
  const {
    data: connections = [],
    isLoading,
    error,
  } = useCachedPromise(listConnections, [], { keepPreviousData: true });
  const { value: lastAccounts, setValue: setLastAccounts } = useLocalStorage<string[]>("last-accounts", []);
  const [submitting, setSubmitting] = useState(false);

  const postable = useMemo(() => connections.filter(isPostable), [connections]);
  const broken = useMemo(() => connections.filter((c) => c.isActive !== false && !isPostable(c)), [connections]);
  const byId = useMemo(() => new Map(connections.map((c) => [c.id, c])), [connections]);

  const { handleSubmit, itemProps, values, setValue, setValidationError, reset } = useForm<FormValues>({
    initialValues: { caption: "", accounts: [], media: [], title: "", when: WHEN.Now, scheduledFor: null },
    validation: {
      accounts: (value) => {
        if (!value || value.length === 0) return "Pick at least one account";
        if (value.length > MAX_TARGETS) return `Pick at most ${MAX_TARGETS} accounts per post`;
      },
      media: (value) => (value && value[0] ? validateMediaFile(value[0]) : undefined),
    },
    onSubmit: async (form) => {
      const selected = form.accounts.map((id) => byId.get(id)).filter((c): c is Connection => !!c);
      const mediaPath = form.media[0];
      const caption = form.caption.trim();
      const platforms = selected.map((c) => c.platform);

      // Cross-field checks the per-field validators can't do.
      if (form.when === WHEN.Schedule) {
        const time = form.scheduledFor?.getTime();
        const problem = !time
          ? "Pick a date and time"
          : time <= Date.now()
            ? "Pick a time in the future"
            : time > Date.now() + ONE_YEAR_MS
              ? "Pick a time within a year"
              : undefined;
        if (problem) {
          setValidationError("scheduledFor", problem);
          return false;
        }
      }
      if (!mediaPath && !caption) {
        setValidationError("caption", "Write a caption or attach an image or video");
        return false;
      }
      // Platform pre-checks only warn: the user can post anyway and the API
      // reports any account it can't post to.
      const warnings: string[] = [];
      const needMedia = platforms.filter((p) => MEDIA_REQUIRED_PLATFORMS.includes(p));
      if (!mediaPath && needMedia.length > 0) {
        warnings.push(`${listNames(needMedia)} need an image or video, so posting there will likely fail.`);
      }
      const needVideo = platforms.filter((p) => VIDEO_ONLY_PLATFORMS.includes(p));
      if (mediaPath && !isVideoFile(mediaPath) && needVideo.length > 0) {
        warnings.push(`${listNames(needVideo)} only take videos, so posting this image there will likely fail.`);
      }
      const needTitle = platforms.filter((p) => p in TITLE_PLATFORMS);
      if (needTitle.length > 0 && !form.title.trim() && !firstLine(caption)) {
        warnings.push(`${listNames(needTitle)} posts need a title. Add one, or a caption to take it from.`);
      }
      if (warnings.length > 0) {
        const postAnyway = await confirmAlert({
          title: "Some accounts may not get this post",
          message: warnings.join("\n\n"),
          icon: Icon.Warning,
          primaryAction: { title: "Post Anyway" },
          dismissAction: { title: "Cancel" },
        });
        if (!postAnyway) return false;
      }

      setSubmitting(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating post" });
      try {
        let uploadId: string | undefined;
        if (mediaPath) {
          toast.title = "Uploading media";
          toast.message = "0%";
          uploadId = await uploadFile(mediaPath, (fraction) => {
            toast.message = `${Math.min(100, Math.round(fraction * 100))}%`;
          });
          toast.message = "Processing";
        }

        toast.title = form.when === WHEN.Schedule ? "Scheduling post" : "Publishing post";
        toast.message = undefined;
        const scheduledFor =
          form.when === WHEN.Schedule && form.scheduledFor ? form.scheduledFor.toISOString() : undefined;

        const posts = await createPosts({
          upload_id: uploadId,
          publish_mode: scheduledFor ? PUBLISH_MODE.Scheduled : PUBLISH_MODE.Immediate,
          scheduled_for: scheduledFor,
          caption,
          targets: selected.map((c) => buildTarget(c, caption, form.title.trim())),
        });

        void setLastAccounts(form.accounts);
        const failed = posts.filter((p) => p.status === POST_STATUS.Failed);
        const okCount = posts.length - failed.length;
        const libraryUrl = scheduledFor ? APP_LINKS.scheduled() : APP_LINKS.published();

        if (okCount === 0) {
          toast.style = Toast.Style.Failure;
          toast.title = posts.length === 1 ? "The post failed" : "All posts failed";
          toast.message = failureSummary(failed, byId);
          toast.primaryAction = { title: "Open Failed Posts", onAction: () => open(APP_LINKS.failed()) };
          return;
        }

        toast.style = failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
        toast.title = scheduledFor
          ? `Scheduled for ${formatWhen(scheduledFor)}`
          : `Publishing to ${okCount} ${okCount === 1 ? "account" : "accounts"}`;
        toast.message = failed.length > 0 ? `${failed.length} failed. ${failureSummary(failed, byId)}` : undefined;
        toast.primaryAction = {
          title: "Open in ShortSync",
          onAction: () => open(libraryUrl),
        };
        toast.secondaryAction = {
          title: "Show Scheduled Posts",
          onAction: () => launchCommand({ name: "scheduled-posts", type: LaunchType.UserInitiated }),
        };

        reset({ caption: "", accounts: form.accounts, media: [], title: "", when: WHEN.Now, scheduledFor: null });
        await popToRoot({ clearSearchBar: true });
      } catch (err) {
        await showErrorToast(err, toast);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Preselect the accounts used last time, once connections are known.
  useEffect(() => {
    if (values.accounts.length > 0 || !lastAccounts?.length || postable.length === 0) return;
    const stillThere = lastAccounts.filter((id) => postable.some((c) => c.id === id));
    if (stillThere.length > 0) setValue("accounts", stillThere);
  }, [lastAccounts, postable]);

  const selectedPlatforms = values.accounts.map((id) => byId.get(id)?.platform).filter((p): p is string => !!p);
  const showTitle = selectedPlatforms.some((p) => p in TITLE_PLATFORMS || OPTIONAL_TITLE_PLATFORMS.includes(p));
  const authError = error && isAuthError(error);

  return (
    <Form
      isLoading={isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={values.when === WHEN.Schedule ? "Schedule Post" : "Publish Post"}
            icon={values.when === WHEN.Schedule ? Icon.Calendar : Icon.Upload}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser title="Connect More Accounts" url={APP_LINKS.connections()} />
          <Action.OpenInBrowser title="Open ShortSync" url={APP_LINKS.dashboard()} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {error ? (
        <Form.Description
          title={describeError(error).title}
          text={
            authError
              ? `${API_KEY_HINT} Then paste it in the extension preferences (Cmd/Ctrl + K).`
              : describeError(error).message
          }
        />
      ) : null}

      <Form.TextArea
        {...itemProps.caption}
        title="Caption"
        placeholder="What do you want to share?"
        enableMarkdown={false}
      />

      <Form.TagPicker {...itemProps.accounts} title="Accounts" placeholder="Pick where to post">
        {postable.map((c) => (
          <Form.TagPicker.Item key={c.id} value={c.id} title={connectionLabel(c)} icon={platformIcon(c.platform)} />
        ))}
      </Form.TagPicker>
      {!isLoading && !error && postable.length === 0 ? (
        <Form.Description text="No connected accounts yet. Connect one in ShortSync (Cmd/Ctrl + K, Connect More Accounts)." />
      ) : null}
      {broken.length > 0 ? (
        <Form.Description
          text={`${broken.map(connectionLabel).join(", ")} ${broken.length === 1 ? "needs" : "need"} reconnecting in ShortSync before you can post there.`}
        />
      ) : null}

      <Form.FilePicker
        {...itemProps.media}
        title="Image or Video"
        info={`Optional. ${SUPPORTED_EXTENSIONS.map((e) => e.slice(1)).join(", ")}. Videos up to 2 GB, images up to 20 MB.`}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />

      {showTitle ? (
        <Form.TextField
          {...itemProps.title}
          title="Title"
          placeholder="Defaults to the caption's first line"
          info="Used by YouTube, Reddit, Pinterest, Tumblr, WordPress, Ghost and Blogger. YouTube also uses the caption as its description."
        />
      ) : null}

      <Form.Separator />

      <Form.Dropdown {...itemProps.when} title="When">
        <Form.Dropdown.Item value={WHEN.Now} title="Publish now" icon={Icon.Upload} />
        <Form.Dropdown.Item value={WHEN.Schedule} title="Schedule" icon={Icon.Calendar} />
      </Form.Dropdown>
      {values.when === WHEN.Schedule ? (
        <Form.DatePicker
          {...itemProps.scheduledFor}
          title="Date and Time"
          type={Form.DatePicker.Type.DateTime}
          min={new Date()}
        />
      ) : null}
    </Form>
  );
}

function buildTarget(connection: Connection, caption: string, title: string): PostTarget {
  const target: PostTarget = { connection_id: connection.id };
  const titleLimit = TITLE_PLATFORMS[connection.platform as Platform];
  if (titleLimit) {
    target.title = (title || firstLine(caption)).slice(0, titleLimit);
  } else if (title && OPTIONAL_TITLE_PLATFORMS.includes(connection.platform)) {
    target.title = title;
  }
  if (DESCRIPTION_PLATFORMS.includes(connection.platform)) {
    target.description = caption;
  }
  return target;
}

function listNames(platforms: string[]): string {
  const names = Array.from(new Set(platforms.map(platformName)));
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function failureSummary(
  failed: { connection_id: string; error: { message?: string } | null }[],
  byId: Map<string, Connection>,
) {
  const first = failed[0];
  if (!first) return "";
  const connection = byId.get(first.connection_id);
  const where = connection ? `${platformName(connection.platform)}: ` : "";
  return `${where}${first.error?.message ?? "Unknown error"}`;
}
