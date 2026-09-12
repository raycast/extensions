import { Action, ActionPanel, Clipboard, Form, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedState, useForm, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { createDraft, listSocialSets, listTags } from "../lib/api";
import {
  DEFAULT_SOCIAL_SET_STORAGE_KEY,
  LAST_SOCIAL_SET_STORAGE_KEY,
  PLATFORM_KEYS,
  PLATFORM_LABELS,
  PLATFORM_SELECTIONS_STORAGE_KEY,
  type PlatformKey,
} from "../lib/constants";
import { ApiKeyRequiredView } from "../components/api-key-required";
import { getPreferences } from "../lib/preferences";
import type { SocialSetListItem, Tags } from "../lib/types";
import { getErrorMessage } from "../lib/utils";

type PublishOption = "draft" | "now" | "schedule";

const TIME_OPTIONS = buildTimeOptions(15);

type FormValues = {
  socialSetId: string;
  platforms: string[];
  content: string;
  draftTitle?: string;
  tags: string[];
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

function buildDraftTitle(content: string, providedTitle?: string) {
  const title = providedTitle?.trim();
  if (title) {
    return title;
  }

  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled draft";
  }

  return firstLine.length > 80 ? `${firstLine.slice(0, 80).trim()}…` : firstLine;
}

function getSocialSetUsername(socialSet: SocialSetListItem) {
  return (
    socialSet.twitter?.username ||
    socialSet.linkedin?.vanity_name ||
    socialSet.instagram?.username ||
    socialSet.tiktok?.username ||
    socialSet.account_owner
  );
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

  const groupedSocialSets = useMemo(() => {
    const items = socialSets ?? [];
    const noTeam = items.filter((socialSet) => !socialSet.teams || socialSet.teams.length === 0);
    const withTeam = items.filter((socialSet) => socialSet.teams && socialSet.teams.length > 0);
    return { noTeam, withTeam };
  }, [socialSets]);

  const availableSocialSetIds = useMemo(
    () => new Set((socialSets ?? []).map((socialSet) => String(socialSet.account_id))),
    [socialSets],
  );

  const { handleSubmit, itemProps, values, reset, focus, setValue, setValidationError } = useForm<FormValues>({
    initialValues: {
      socialSetId: props.socialSetId ?? (props.draftValues?.socialSetId as string) ?? "",
      platforms: (props.draftValues?.platforms as string[]) ?? [],
      content: (props.draftValues?.content as string) ?? "",
      draftTitle: (props.draftValues?.draftTitle as string) ?? "",
      tags: (props.draftValues?.tags as string[]) ?? [],
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
      const rawContent = formValues.content.trim();
      if (!rawContent) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Add content to create a draft",
        });
        return;
      }

      let scheduleAt: string | undefined;
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
        scheduleAt = scheduledDate.toISOString();
      }

      const tagIds = (formValues.tags ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);

      await showToast({ style: Toast.Style.Animated, title: "Creating draft" });

      try {
        const draft = await createDraft({
          account_id: Number(formValues.socialSetId),
          platforms: formValues.platforms as PlatformKey[],
          post_raw_content: rawContent,
          publish_now: publishOption === "now",
          schedule_at: scheduleAt,
          draft_title: buildDraftTitle(rawContent, formValues.draftTitle),
          tags: tagIds.length > 0 ? tagIds : undefined,
        });

        reset({
          content: "",
        });
        focus("content");

        await showToast({
          style: Toast.Style.Success,
          title: "Draft created",
          message: `Post ID: ${draft.id}`,
          primaryAction: {
            title: "Copy Post ID",
            onAction: async () => {
              await Clipboard.copy(String(draft.id));
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
    if (!socialSets || socialSets.length === 0 || values.socialSetId) {
      return;
    }
    const candidate = defaultSocialSetId || lastSocialSetId || "";
    if (candidate && availableSocialSetIds.has(candidate)) {
      itemProps.socialSetId.onChange?.(candidate);
    }
  }, [
    availableSocialSetIds,
    defaultSocialSetId,
    itemProps.socialSetId,
    lastSocialSetId,
    socialSets,
    values.socialSetId,
  ]);

  useEffect(() => {
    if (socialSets && socialSets.length === 1 && !values.socialSetId) {
      itemProps.socialSetId.onChange?.(String(socialSets[0].account_id));
    }
  }, [itemProps.socialSetId, socialSets, values.socialSetId]);

  useEffect(() => {
    if (!values.socialSetId || availableSocialSetIds.has(values.socialSetId)) {
      return;
    }
    itemProps.socialSetId.onChange?.("");
  }, [availableSocialSetIds, itemProps.socialSetId, values.socialSetId]);

  useEffect(() => {
    if (values.socialSetId) {
      setLastSocialSetId(values.socialSetId);
    }
  }, [setLastSocialSetId, values.socialSetId]);

  const { data: tags, isLoading: isLoadingTags } = usePromise(
    async (id?: string) => {
      if (!id) {
        return [] as Tags[];
      }
      return listTags(Number(id));
    },
    [values.socialSetId],
    { execute: Boolean(values.socialSetId) },
  );

  const availablePlatforms = PLATFORM_KEYS;

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

  const isLoading = isLoadingSocialSets || isLoadingTags;

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
                key={socialSet.account_id}
                value={String(socialSet.account_id)}
                title={`${socialSet.account_name} (@${getSocialSetUsername(socialSet)})`}
              />
            ))}
          </Form.Dropdown.Section>
        )}
        {groupedSocialSets.withTeam.length > 0 && (
          <Form.Dropdown.Section title="Team Accounts">
            {groupedSocialSets.withTeam.map((socialSet) => (
              <Form.Dropdown.Item
                key={socialSet.account_id}
                value={String(socialSet.account_id)}
                title={`${socialSet.account_name} (@${getSocialSetUsername(socialSet)})`}
              />
            ))}
          </Form.Dropdown.Section>
        )}
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
      <Form.Description text="Separate posts with --- to create a thread." />

      <Form.Separator />

      <Form.Dropdown
        id="publishOption"
        title="Publish"
        value={publishOption}
        onChange={(value) => setPublishOption(value as PublishOption)}
      >
        <Form.Dropdown.Item title="Save as draft" value="draft" icon={Icon.Circle} />
        <Form.Dropdown.Item title="Publish now" value="now" icon={Icon.Bolt} />
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

      <Form.TextField title="Draft Title" placeholder="Optional" {...itemProps.draftTitle} />

      <Form.TagPicker title="Tags" placeholder="Select tags" {...itemProps.tags}>
        {(tags || []).map((tag) => (
          <Form.TagPicker.Item
            key={tag.tag_id}
            value={String(tag.tag_id)}
            title={tag.tag || `Tag ${tag.tag_id}`}
            icon={Icon.Tag}
          />
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
