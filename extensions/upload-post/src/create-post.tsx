import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  launchCommand,
  LaunchType,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import {
  accountLabel,
  connectedAccounts,
  createPost,
  getProfiles,
  isUrl,
  parseApiDate,
  platformName,
  PLATFORMS_BY_TYPE,
  PostType,
  UNAVAILABLE_PLATFORMS,
  urls,
} from "./api";
import { UploadStatus } from "./components/upload-status";

type MediaSource = "file" | "url";

interface FormValues {
  profile: string;
  type: string;
  platforms: string[];
  mediaSource: string;
  files: string[];
  mediaUrls: string;
  title: string;
  description: string;
  firstComment: string;
  scheduledDate: Date | null;
  addToQueue: boolean;
}

const TYPE_TITLES: Record<PostType, string> = { text: "Text", photo: "Photo", video: "Video" };

export default function Command() {
  const { push } = useNavigation();
  const { data, isLoading } = useCachedPromise(getProfiles, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load profiles" });
    },
  });
  const profiles = data?.profiles ?? [];

  // Validators need the other fields (post type, media source); they read them from this ref.
  const current = useRef<Partial<FormValues>>({});
  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    initialValues: {
      type: "video",
      mediaSource: "file",
      platforms: [],
      files: [],
      addToQueue: false,
    },
    validation: {
      profile: (value) => (!value ? "Select a profile" : undefined),
      platforms: (value) => (!value || value.length === 0 ? "Select at least one platform" : undefined),
      title: (value) => {
        if (current.current.type === "text" && !value?.trim()) return "Write the text of the post";
        if (current.current.platforms?.includes("youtube") && !value?.trim()) return "YouTube needs a title";
      },
      files: (value) => {
        if (current.current.type === "text" || current.current.mediaSource !== "file") return;
        if (!value || value.length === 0)
          return current.current.type === "video" ? "Choose a video" : "Choose at least one photo";
        if (current.current.type === "video" && value.length > 1) return "Choose a single video";
      },
      mediaUrls: (value) => {
        if (current.current.type === "text" || current.current.mediaSource !== "url") return;
        const list = splitUrls(value);
        if (list.length === 0)
          return current.current.type === "video" ? "Enter the video URL" : "Enter at least one photo URL";
        if (list.some((u) => !isUrl(u))) return "URLs must start with http:// or https://";
        if (current.current.type === "video" && list.length > 1) return "Enter a single video URL";
      },
      scheduledDate: (value) => {
        if (value && value.getTime() <= Date.now()) return "Pick a date in the future";
        if (value && current.current.addToQueue) return "Use either a date or the queue";
      },
    },
    async onSubmit(values) {
      const type = values.type as PostType;
      const mediaSource = values.mediaSource as MediaSource;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading post…" });
      try {
        const media = type === "text" ? [] : mediaSource === "file" ? values.files : splitUrls(values.mediaUrls);
        const result = await createPost({
          profile: values.profile,
          platforms: values.platforms,
          type,
          title: values.title ?? "",
          description: values.description || undefined,
          firstComment: values.firstComment || undefined,
          media,
          scheduledDate: values.scheduledDate ? values.scheduledDate.toISOString() : undefined,
          addToQueue: values.addToQueue,
        });

        const requestId = result.request_id;
        const jobId = result.job_id;
        toast.style = Toast.Style.Success;
        if (jobId) {
          const when = parseApiDate(result.scheduled_date)?.toLocaleString();
          toast.title = values.addToQueue ? "Added to queue" : "Post scheduled";
          toast.message = when ? `${when} · job ${jobId}` : `job ${jobId}`;
        } else {
          toast.title = "Post submitted";
          toast.message = requestId ? `request_id ${requestId}` : result.message;
        }
        if (requestId || jobId) {
          toast.primaryAction = {
            title: "Open Status",
            onAction: (t) => {
              t.hide();
              push(jobId ? <UploadStatus jobId={jobId} /> : <UploadStatus requestId={requestId} />);
            },
          };
          toast.secondaryAction = {
            title: "Copy ID",
            onAction: async (t) => {
              await Clipboard.copy(requestId ?? jobId ?? "");
              t.hide();
            },
          };
        }
        if (result.warnings?.length) toast.message = `${toast.message ?? ""} · ${result.warnings.join(" ")}`;

        setValue("title", "");
        setValue("description", "");
        setValue("firstComment", "");
        setValue("files", []);
        setValue("mediaUrls", "");
        setValue("scheduledDate", null);
      } catch (error) {
        await showFailureToast(error, { title: "Could not create the post" });
      }
    },
  });

  current.current = values;
  const type = (values.type || "video") as PostType;
  const mediaSource = (values.mediaSource || "file") as MediaSource;
  const selectedProfile = profiles.find((p) => p.username === values.profile);
  const available = useMemo(
    () =>
      selectedProfile
        ? connectedAccounts(selectedProfile).filter(
            (a) => !UNAVAILABLE_PLATFORMS.includes(a.platform) && PLATFORMS_BY_TYPE[type].includes(a.platform),
          )
        : [],
    [selectedProfile, type],
  );

  // Pick the first profile once they load.
  useEffect(() => {
    if (!values.profile && profiles.length > 0) setValue("profile", profiles[0].username);
  }, [profiles, values.profile]);

  const noAccounts = !isLoading && selectedProfile && available.length === 0;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={values.addToQueue ? "Add to Queue" : values.scheduledDate ? "Schedule Post" : "Publish Post"}
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Scheduled Posts"
            icon={Icon.Calendar}
            onAction={() => launchCommand({ name: "scheduled-posts", type: LaunchType.UserInitiated })}
          />
          <Action.OpenInBrowser title="Manage Connected Accounts" url={urls.manageProfiles} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.profile}
        title="Profile"
        info="The Upload-Post profile whose connected accounts will publish the post"
        onChange={(value) => {
          itemProps.profile.onChange?.(value);
          if (value !== values.profile) setValue("platforms", []);
        }}
      >
        {profiles.map((profile) => (
          <Form.Dropdown.Item
            key={profile.username}
            value={profile.username}
            title={profile.username}
            icon={Icon.Person}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        {...itemProps.type}
        title="Post Type"
        onChange={(value) => {
          itemProps.type.onChange?.(value);
          setValue(
            "platforms",
            values.platforms.filter((p) => PLATFORMS_BY_TYPE[value as PostType].includes(p)),
          );
        }}
      >
        <Form.Dropdown.Item value="video" title={TYPE_TITLES.video} icon={Icon.Video} />
        <Form.Dropdown.Item value="photo" title={TYPE_TITLES.photo} icon={Icon.Image} />
        <Form.Dropdown.Item value="text" title={TYPE_TITLES.text} icon={Icon.Text} />
      </Form.Dropdown>

      <Form.TagPicker
        {...itemProps.platforms}
        title="Platforms"
        placeholder="Choose where to publish"
        info={`Accounts connected to this profile that can publish ${type} posts`}
      >
        {available.map((a) => (
          <Form.TagPicker.Item
            key={a.platform}
            value={a.platform}
            title={`${platformName(a.platform)}${accountLabel(a.account) ? ` (${accountLabel(a.account)})` : ""}${
              a.reauthRequired ? " – reconnect needed" : ""
            }`}
            icon={a.account?.social_images || Icon.Globe}
          />
        ))}
      </Form.TagPicker>
      {noAccounts && (
        <Form.Description
          title=""
          text={`This profile has no connected account that can publish ${type} posts. Connect one at ${urls.manageProfiles}`}
        />
      )}

      {type !== "text" && (
        <>
          <Form.Separator />
          <Form.Dropdown {...itemProps.mediaSource} title="Media Source">
            <Form.Dropdown.Item value="file" title="Local File" icon={Icon.Finder} />
            <Form.Dropdown.Item value="url" title="URL" icon={Icon.Link} />
          </Form.Dropdown>
          {mediaSource === "file" ? (
            <Form.FilePicker
              {...itemProps.files}
              title={type === "video" ? "Video" : "Photos"}
              allowMultipleSelection={type === "photo"}
              canChooseDirectories={false}
            />
          ) : (
            <Form.TextArea
              {...itemProps.mediaUrls}
              title={type === "video" ? "Video URL" : "Photo URLs"}
              placeholder={type === "video" ? "https://example.com/video.mp4" : "One image URL per line"}
            />
          )}
        </>
      )}

      <Form.Separator />
      <Form.TextArea
        {...itemProps.title}
        title={type === "text" ? "Text" : "Title / Caption"}
        placeholder={type === "text" ? "What do you want to share?" : "Caption shown on every platform"}
        enableMarkdown={false}
      />
      {type !== "text" && (
        <Form.TextArea
          {...itemProps.description}
          title="Description"
          placeholder="Optional longer text (YouTube, LinkedIn, Facebook, Pinterest)"
        />
      )}
      <Form.TextField
        {...itemProps.firstComment}
        title="First Comment"
        placeholder="Optional comment posted right after publishing"
      />

      <Form.Separator />
      <Form.DatePicker
        {...itemProps.scheduledDate}
        title="Schedule"
        info="Leave empty to publish now. Up to 365 days ahead."
        min={new Date()}
      />
      <Form.Checkbox
        {...itemProps.addToQueue}
        title="Queue"
        label="Add to queue"
        info="Publish in the next free slot of this profile's queue (set up in Upload-Post). Can't be combined with a date."
      />
    </Form>
  );
}

function splitUrls(value?: string): string[] {
  return (value ?? "")
    .split(/[\n,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}
