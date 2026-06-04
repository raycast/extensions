import { Action, ActionPanel, Clipboard, Form, Icon, LaunchProps, open, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedState, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { createDraft, getSocialSetDetail, listSocialSets, listTags } from "../lib/api";
import {
  DEFAULT_SOCIAL_SET_STORAGE_KEY,
  LAST_SOCIAL_SET_STORAGE_KEY,
  PLATFORM_KEYS,
  PLATFORM_LABELS,
  PLATFORM_SELECTIONS_STORAGE_KEY,
  THREAD_PLATFORMS,
  type PlatformKey,
} from "../lib/constants";
import { ApiKeyRequiredView } from "../components/api-key-required";
import { getPreferences } from "../lib/preferences";
import type { DraftCreatePlatforms, Tag } from "../lib/types";
import { buildPostsFromContent, getErrorMessage, groupSocialSetsByTeam } from "../lib/utils";

type PublishOption = "draft" | "now" | "next-free-slot" | "schedule";
type ShareOption = "yes" | "no";

const TIME_OPTIONS = buildTimeOptions(15);
const SHARE_OPTIONS: Array<{ value: ShareOption; title: string }> = [
  { value: "yes", title: "Yes" },
  { value: "no", title: "No" },
];

type FormValues = {
  socialSetId: string;
  platforms: string[];
  content: string;
  draftTitle?: string;
  scratchpadText?: string;
  tags: string[];
  shareOption: string;
  scheduleDate: Date | null;
  scheduleTime?: string;
};

type TimeOption = {
  value: string;
  title: string;
};

function buildTimeOptions(stepMinutes: number): TimeOption[] {
  const options: TimeOption[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    const label = `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    options.push({ value: label, title: label });
  }
  return options;
}

function buildScheduledDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return undefined;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

export function CreateDraftForm(props: { socialSetId?: string; draftValues?: Form.Values }) {
  const [defaultSocialSetId] = useCachedState<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  const [lastSocialSetId, setLastSocialSetId] = useCachedState<string>(LAST_SOCIAL_SET_STORAGE_KEY);
  const [platformSelectionsBySocialSet, setPlatformSelectionsBySocialSet] = useCachedState<Record<string, string[]>>(
    PLATFORM_SELECTIONS_STORAGE_KEY,
    {},
  );
  const [publishOption, setPublishOption] = useState<PublishOption>(
    (props.draftValues?.publishOption as PublishOption) ?? "draft",
  );
  const previousSocialSetId = useRef<string | undefined>(undefined);
  const hasInitializedPlatforms = useRef(false);

  const { data: socialSets, isLoading: isLoadingSocialSets } = usePromise(listSocialSets, []);

  const groupedSocialSets = useMemo(() => groupSocialSetsByTeam(socialSets ?? []), [socialSets]);

  const { handleSubmit, itemProps, values, reset, focus, setValue, setValidationError } = useForm<FormValues>({
    initialValues: {
      socialSetId: props.socialSetId ?? (props.draftValues?.socialSetId as string) ?? "",
      platforms: (props.draftValues?.platforms as string[]) ?? [],
      content: (props.draftValues?.content as string) ?? "",
      draftTitle: (props.draftValues?.draftTitle as string) ?? "",
      scratchpadText: (props.draftValues?.scratchpadText as string) ?? "",
      tags: (props.draftValues?.tags as string[]) ?? [],
      shareOption: (props.draftValues?.shareOption as string) ?? "no",
      scheduleDate: (props.draftValues?.scheduleDate as Date) ?? null,
      scheduleTime: (props.draftValues?.scheduleTime as string) ?? undefined,
    },
    validation: {
      socialSetId: FormValidation.Required,
      content: FormValidation.Required,
      platforms: (value) => (value && value.length > 0 ? undefined : "Select at least one platform"),
      scheduleDate: publishOption === "schedule" ? FormValidation.Required : undefined,
      scheduleTime: publishOption === "schedule" ? FormValidation.Required : undefined,
    },
    onSubmit: async (formValues) => {
      const threadPosts = buildPostsFromContent(formValues.content, true);
      if (threadPosts.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Add content to create a draft",
        });
        return;
      }

      const singlePost = buildPostsFromContent(formValues.content, false);

      const platforms: DraftCreatePlatforms = {};
      for (const platform of formValues.platforms as PlatformKey[]) {
        platforms[platform] = {
          enabled: true,
          posts: THREAD_PLATFORMS.has(platform) ? threadPosts : singlePost,
        };
      }

      let publishAt: string | undefined;
      if (publishOption === "schedule") {
        if (!formValues.scheduleDate || !formValues.scheduleTime) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Pick a date and time",
          });
          return;
        }
        const scheduledDate = buildScheduledDate(formValues.scheduleDate, formValues.scheduleTime);
        if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Pick a valid time",
          });
          return;
        }
        if (scheduledDate.getTime() <= Date.now()) {
          setValidationError("scheduleDate", "Pick a future time");
          await showToast({
            style: Toast.Style.Failure,
            title: "Pick a future time",
          });
          return;
        }
        publishAt = scheduledDate.toISOString();
      } else if (publishOption !== "draft") {
        publishAt = publishOption;
      }

      await showToast({ style: Toast.Style.Animated, title: "Creating draft" });

      try {
        const draft = await createDraft(Number(formValues.socialSetId), {
          platforms,
          draft_title: formValues.draftTitle || undefined,
          scratchpad_text: formValues.scratchpadText || undefined,
          tags: formValues.tags && formValues.tags.length > 0 ? formValues.tags : undefined,
          share: formValues.shareOption === "yes" ? true : undefined,
          publish_at: publishAt || undefined,
        });

        reset({
          content: "",
        });
        focus("content");

        await showToast({
          style: Toast.Style.Success,
          title: "Draft created",
          primaryAction: {
            title: "Open Draft",
            onAction: async () => {
              await open(draft.private_url);
            },
          },
          secondaryAction: {
            title: "Copy Draft URL",
            onAction: async () => {
              await Clipboard.copy(draft.private_url);
            },
          },
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create draft",
          message: getErrorMessage(error),
        });
      }
    },
  });

  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.readText();
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard has no text to paste",
      });
      return;
    }
    setValue("content", (current) => (current ? `${current}\n${text}` : text));
    focus("content");
  };

  const handleClearContent = () => {
    setValue("content", "");
    focus("content");
  };

  useEffect(() => {
    if (props.socialSetId && props.socialSetId !== values.socialSetId) {
      itemProps.socialSetId.onChange?.(props.socialSetId);
    }
  }, [itemProps.socialSetId, props.socialSetId, values.socialSetId]);

  useEffect(() => {
    if (!values.socialSetId && (defaultSocialSetId || lastSocialSetId)) {
      itemProps.socialSetId.onChange?.(defaultSocialSetId || lastSocialSetId || "");
    }
  }, [defaultSocialSetId, itemProps.socialSetId, lastSocialSetId, values.socialSetId]);

  useEffect(() => {
    if (socialSets && socialSets.length === 1 && !values.socialSetId) {
      itemProps.socialSetId.onChange?.(String(socialSets[0].id));
    }
  }, [itemProps.socialSetId, socialSets, values.socialSetId]);

  useEffect(() => {
    if (values.socialSetId) {
      setLastSocialSetId(values.socialSetId);
    }
  }, [setLastSocialSetId, values.socialSetId]);

  const { data: socialSetDetail, isLoading: isLoadingSocialSetDetail } = usePromise(
    async (id?: string) => {
      if (!id) {
        return undefined;
      }
      return getSocialSetDetail(Number(id));
    },
    [values.socialSetId],
    { execute: Boolean(values.socialSetId) },
  );

  const { data: tags, isLoading: isLoadingTags } = usePromise(
    async (id?: string) => {
      if (!id) {
        return [] as Tag[];
      }
      return listTags(Number(id));
    },
    [values.socialSetId],
    { execute: Boolean(values.socialSetId) },
  );

  const availablePlatforms = useMemo(() => {
    if (!socialSetDetail) {
      return PLATFORM_KEYS;
    }
    return PLATFORM_KEYS.filter((platform) => socialSetDetail.platforms[platform] !== null);
  }, [socialSetDetail]);

  useEffect(() => {
    if (previousSocialSetId.current && previousSocialSetId.current !== values.socialSetId) {
      itemProps.platforms.onChange?.([]);
      itemProps.tags.onChange?.([]);
      hasInitializedPlatforms.current = false;
    }
    previousSocialSetId.current = values.socialSetId;
  }, [itemProps.platforms, itemProps.tags, values.socialSetId]);

  useEffect(() => {
    if (!values.platforms || values.platforms.length === 0) {
      return;
    }
    const filtered = values.platforms.filter((platform) => availablePlatforms.includes(platform as PlatformKey));
    if (filtered.length !== values.platforms.length) {
      itemProps.platforms.onChange?.(filtered);
    }
  }, [availablePlatforms, itemProps.platforms, values.platforms]);

  useEffect(() => {
    if (!values.socialSetId || hasInitializedPlatforms.current) {
      return;
    }
    if (values.platforms && values.platforms.length > 0) {
      hasInitializedPlatforms.current = true;
      return;
    }
    const storedPlatforms = platformSelectionsBySocialSet?.[values.socialSetId];
    if (storedPlatforms && storedPlatforms.length > 0) {
      const filtered = storedPlatforms.filter((platform) => availablePlatforms.includes(platform as PlatformKey));
      if (filtered.length > 0) {
        itemProps.platforms.onChange?.(filtered);
        hasInitializedPlatforms.current = true;
        return;
      }
    }
    if (availablePlatforms.length > 0) {
      itemProps.platforms.onChange?.([availablePlatforms[0]]);
      hasInitializedPlatforms.current = true;
    }
  }, [availablePlatforms, itemProps.platforms, platformSelectionsBySocialSet, values.platforms, values.socialSetId]);

  useEffect(() => {
    if (!values.socialSetId) {
      return;
    }
    setPlatformSelectionsBySocialSet((previous) => ({
      ...(previous || {}),
      [values.socialSetId]: values.platforms || [],
    }));
  }, [setPlatformSelectionsBySocialSet, values.platforms, values.socialSetId]);

  const isLoading = isLoadingSocialSets || isLoadingSocialSetDetail || isLoadingTags;

  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Create Draft" onSubmit={handleSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Paste from Clipboard" icon={Icon.Document} onAction={handlePasteFromClipboard} />
            <Action title="Clear Content" icon={Icon.Trash} onAction={handleClearContent} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Social Set" {...itemProps.socialSetId}>
        {groupedSocialSets.noTeam.length > 0 && (
          <Form.Dropdown.Section title="Personal">
            {groupedSocialSets.noTeam.map((socialSet) => (
              <Form.Dropdown.Item
                key={socialSet.id}
                value={String(socialSet.id)}
                title={`${socialSet.name} (@${socialSet.username})`}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {groupedSocialSets.teamOrder.map((teamId) => {
          const teamGroup = groupedSocialSets.teamMap.get(teamId);
          if (!teamGroup) return null;
          return (
            <Form.Dropdown.Section key={teamId} title={teamGroup.name}>
              {teamGroup.items.map((socialSet) => (
                <Form.Dropdown.Item
                  key={socialSet.id}
                  value={String(socialSet.id)}
                  title={`${socialSet.name} (@${socialSet.username})`}
                />
              ))}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>

      <Form.TagPicker title="Platforms" placeholder="Select platforms" {...itemProps.platforms}>
        {availablePlatforms.map((platform) => (
          <Form.TagPicker.Item key={platform} value={platform} title={PLATFORM_LABELS[platform]} icon={Icon.Dot} />
        ))}
      </Form.TagPicker>

      <Form.TextArea
        title="Content"
        placeholder="Write your post. Use --- to split into a thread."
        autoFocus
        {...itemProps.content}
      />
      <Form.Description text="Separate posts with --- to create a thread. On single-post platforms like LinkedIn, the separator is removed and content is merged." />

      <Form.Separator />

      <Form.Dropdown
        id="publishOption"
        title="Publish"
        value={publishOption}
        onChange={(value) => setPublishOption(value as PublishOption)}
      >
        <Form.Dropdown.Item title="Save as draft" value="draft" icon={Icon.Circle} />
        <Form.Dropdown.Item title="Publish now" value="now" icon={Icon.Bolt} />
        <Form.Dropdown.Item title="Next free slot" value="next-free-slot" icon={Icon.ArrowRightCircle} />
        <Form.Dropdown.Item title="Schedule" value="schedule" icon={Icon.Clock} />
      </Form.Dropdown>

      {publishOption === "schedule" ? (
        <>
          <Form.DatePicker title="Publish date" type={Form.DatePicker.Type.Date} {...itemProps.scheduleDate} />
          <Form.Dropdown title="Publish time" {...itemProps.scheduleTime}>
            {TIME_OPTIONS.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
          <Form.Description title="Schedule" text="Times use your local timezone." />
        </>
      ) : null}
      <Form.Separator />

      <Form.Dropdown title="Generate share URL" {...itemProps.shareOption}>
        {SHARE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Draft Title" placeholder="Optional" {...itemProps.draftTitle} />
      <Form.TextArea title="Scratchpad" placeholder="Optional notes" {...itemProps.scratchpadText} />

      <Form.TagPicker title="Tags" placeholder="Select tags" {...itemProps.tags}>
        {(tags || []).map((tag) => (
          <Form.TagPicker.Item key={tag.slug} value={tag.slug} title={tag.name} icon={Icon.Tag} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    return <ApiKeyRequiredView />;
  }
  return <CreateDraftForm draftValues={props.draftValues} />;
}
