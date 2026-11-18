import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Image,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { api } from "../lib/api";
import { APP_URL } from "../lib/client";
import { runWithToast, showApiError } from "../lib/feedback";
import {
  buildCreatePostBody,
  canPostText,
  localTimezone,
  PLATFORM_LABELS,
  PostDraft,
  PostTiming,
  validationErrors,
} from "../lib/format";
import { CreatePostBody, CreatePostResult } from "../lib/types";

type CreatePostFormProps = {
  initialAccountIds?: string[];
  draftValues?: Partial<PostDraft>;
  popAfterCreate?: boolean;
};

const SUCCESS_TITLE: Record<PostTiming, string> = {
  draft: "Draft Saved",
  schedule: "Post Scheduled",
  now: "Post Queued for Publishing",
};

const EMPTY_POST: PostDraft = { text: "", accountIds: [], timing: "draft", scheduledAt: null };

async function passesChecks(createPostBody: CreatePostBody): Promise<boolean> {
  const report = await runWithToast(
    { pending: "Checking Post", success: "Post Looks Good", failure: "Could Not Check Post" },
    () => api().validatePost(createPostBody),
  );
  if (!report) return false;
  const errors = validationErrors(report);
  if (report.valid && errors.length === 0) return true;
  await showToast({
    style: Toast.Style.Failure,
    title: "Post Can't Go Out",
    message: errors.join("\n") || "AdaptlyPost refused this post.",
  });
  return false;
}

const confirmPublish = (accountCount: number): Promise<boolean> =>
  confirmAlert({
    title: "Publish Now?",
    message: `This posts to ${accountCount} ${accountCount === 1 ? "account" : "accounts"} right away.`,
    icon: Icon.Upload,
    primaryAction: { title: "Publish", style: Alert.ActionStyle.Default },
  });

const skippedSummary = (result: CreatePostResult): string | undefined =>
  result.skippedPlatforms.length > 0
    ? result.skippedPlatforms.map(({ platform, reason }) => `${PLATFORM_LABELS[platform]}: ${reason}`).join("\n")
    : undefined;

export function CreatePostForm({ initialAccountIds = [], draftValues, popAfterCreate = false }: CreatePostFormProps) {
  const { pop } = useNavigation();
  const { data, isLoading } = useCachedPromise(() => api().listAccounts(), [], {
    onError: (error) => showApiError("Could Not Load Accounts", error),
  });
  const accounts = (data?.accounts ?? []).filter((account) => account.status === "active" && canPostText(account));

  const { handleSubmit, itemProps, values, reset, setValidationError } = useForm<PostDraft>({
    initialValues: { ...EMPTY_POST, accountIds: initialAccountIds, ...draftValues },
    validation: {
      text: (value) => (value?.trim() ? undefined : "Write something to post"),
      accountIds: (value) => (value?.length ? undefined : "Select at least one account"),
    },
    onSubmit: async (postDraft) => {
      if (postDraft.timing === "schedule" && (!postDraft.scheduledAt || postDraft.scheduledAt <= new Date())) {
        setValidationError("scheduledAt", "Pick a time in the future");
        return false;
      }
      const createPostBody = buildCreatePostBody(postDraft, localTimezone());
      if (!(await passesChecks(createPostBody))) return false;
      if (postDraft.timing === "now" && !(await confirmPublish(postDraft.accountIds.length))) return false;

      const result = await runWithToast(
        {
          pending: "Sending to AdaptlyPost",
          success: SUCCESS_TITLE[postDraft.timing],
          failure: "Could Not Create Post",
        },
        () => api().createPost(createPostBody),
      );
      if (!result) return false;

      const skipped = skippedSummary(result);
      if (skipped) {
        await showToast({ style: Toast.Style.Failure, title: "Some Accounts Were Skipped", message: skipped });
      }
      reset(EMPTY_POST);
      if (popAfterCreate) pop();
      return true;
    },
  });

  return (
    <Form
      isLoading={isLoading}
      enableDrafts={!popAfterCreate}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Post" icon={Icon.Upload} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Composer" url={`${APP_URL}/create-post`} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Text" placeholder="What do you want to say?" {...itemProps.text} />
      <Form.TagPicker title="Accounts" {...itemProps.accountIds}>
        {accounts.map((account) => (
          <Form.TagPicker.Item
            key={account.id}
            value={account.id}
            title={`${account.displayName} (${PLATFORM_LABELS[account.platform]})`}
            icon={account.avatarUrl ? { source: account.avatarUrl, mask: Image.Mask.Circle } : Icon.Person}
          />
        ))}
      </Form.TagPicker>
      <Form.Dropdown
        id={itemProps.timing.id}
        title="When"
        value={values.timing}
        onChange={(value) => itemProps.timing.onChange?.(value as PostTiming)}
      >
        <Form.Dropdown.Item value="draft" title="Save as Draft" icon={Icon.Document} />
        <Form.Dropdown.Item value="schedule" title="Schedule" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="now" title="Publish Now" icon={Icon.Upload} />
      </Form.Dropdown>
      {values.timing === "schedule" && <Form.DatePicker title="Publish At" {...itemProps.scheduledAt} />}
      <Form.Description text="Text posts only, so Instagram, TikTok, Pinterest and YouTube accounts aren't listed. Use the composer for those." />
    </Form>
  );
}
