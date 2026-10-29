import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  createPost,
  getPinterestBoards,
  type Channel,
  type PostMode,
  type SchedulingType,
  type AssetInput,
  type ImageAssetInput,
  type VideoAssetInput,
  type PostMetadata,
  type GoogleBusinessMetadata,
  type PinterestBoard,
} from "./api";
import { validateUrl } from "./helpers/validation";
import { resolveSchedulingType } from "./helpers/scheduling";
import { useOrganization } from "./hooks/useOrganization";
import {
  GOOGLE_SERVICES,
  NOTIFICATION_CAPABLE_SERVICES,
  getAllowedAttachmentTypes,
  getAttachmentRule,
  buildFacebookMetadata,
  validateFacebook,
  buildGoogleBusinessMetadata,
  validateGoogleBusiness,
  buildInstagramMetadata,
  validateInstagram,
  validateMastodon,
  buildPinterestMetadata,
  validatePinterest,
  validateStartPage,
  validateTiktok,
  buildYoutubeMetadata,
  validateYoutube,
  type PostFormValues,
} from "./networks";
import { FacebookFields } from "./networks/facebook.fields";
import { GoogleBusinessFields } from "./networks/google-business.fields";
import { InstagramFields } from "./networks/instagram.fields";
import { PinterestFields } from "./networks/pinterest.fields";
import { YoutubeFields } from "./networks/youtube.fields";

const POST_MODES: { value: PostMode; title: string }[] = [
  { value: "shareNow", title: "Share Now" },
  { value: "addToQueue", title: "Add to Queue" },
  { value: "shareNext", title: "Share Next" },
  { value: "customScheduled", title: "Custom Schedule" },
];

export default function CreatePostCommand() {
  const {
    organizations,
    selectedOrg,
    needsOrgPicker,
    selectOrgById,
    channels,
    isLoading,
  } = useOrganization();

  const [mode, setMode] = useState<PostMode>("shareNow");
  const [schedulingType, setSchedulingType] =
    useState<SchedulingType>("automatic");
  const [attachmentType, setAttachmentType] = useState("none");
  const [selectedChannelId, setSelectedChannelId] = useState<
    string | undefined
  >();
  const [googlePostType, setGooglePostType] =
    useState<GoogleBusinessMetadata["type"]>("whats_new");
  const [pinterestBoards, setPinterestBoards] = useState<
    PinterestBoard[] | undefined
  >();
  const [boardsLoading, setBoardsLoading] = useState(false);

  // Check if the selected channel needs a scheduling type picker
  const selectedChannel = channels?.find((ch) => ch.id === selectedChannelId);
  const selectedService = selectedChannel?.service.toLowerCase();
  const selectedType = selectedChannel?.type?.toLowerCase();

  const isInstagram = selectedService === "instagram";
  const isInstagramProfile = isInstagram && selectedType === "profile";
  const isFacebook = selectedService === "facebook";
  const isFacebookGroup = isFacebook && selectedType === "group";
  const isGoogle = selectedService
    ? GOOGLE_SERVICES.has(selectedService)
    : false;
  const isPinterest = selectedService === "pinterest";
  const isYoutube = selectedService === "youtube";
  const isTikTok = selectedService === "tiktok";
  const isMastodon = selectedService === "mastodon";
  const isStartPage = selectedService === "startpage";

  const networkContext = { isFacebookGroup, isInstagramProfile };

  // Facebook Groups and Instagram Profiles only support notification scheduling, so the
  // automatic/notification picker is hidden for them (resolveSchedulingType forces the
  // correct value at submit time regardless of this field's default).
  const showSchedulingType =
    (selectedService
      ? NOTIFICATION_CAPABLE_SERVICES.has(selectedService)
      : false) && !isInstagramProfile;

  const resolvedSchedulingType = resolveSchedulingType(
    schedulingType,
    selectedService,
    isFacebookGroup,
    isInstagramProfile,
  );
  // YouTube's extra properties (title, category, privacy, etc.) only apply when the video
  // will actually be published; they're irrelevant and hidden when the scheduling mode is
  // "Notification" (manual publish), matching the n8n node's behavior.
  const isYoutubeNotification =
    isYoutube && resolvedSchedulingType === "notification";

  // Filter attachment options based on selected channel
  const allowedAttachments = getAllowedAttachmentTypes(
    selectedChannel?.service,
  );

  function handleChannelChange(channelId: string) {
    setSelectedChannelId(channelId);
    const ch = channels?.find((c) => c.id === channelId);
    const rule = getAttachmentRule(ch?.service);
    // Reset attachment type if current selection isn't allowed
    if (!(rule.allowed as string[]).includes(attachmentType)) {
      setAttachmentType(rule.allowed[0]);
    }
  }

  // Clear the previously selected channel whenever the organization changes so a channel
  // from the old organization can never remain selected (and thus submitted) while the new
  // organization's channels are loading or after they've loaded.
  useEffect(() => {
    setSelectedChannelId(undefined);
  }, [selectedOrg?.id]);

  useEffect(() => {
    if (!isPinterest || !selectedChannelId) {
      setPinterestBoards(undefined);
      return;
    }
    let cancelled = false;
    setBoardsLoading(true);
    getPinterestBoards(selectedChannelId)
      .then((boards) => {
        if (!cancelled) setPinterestBoards(boards);
      })
      .catch(() => {
        if (!cancelled) setPinterestBoards(undefined);
      })
      .finally(() => {
        if (!cancelled) setBoardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPinterest, selectedChannelId]);

  async function handleSubmit(values: PostFormValues) {
    if (!values.channelId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a channel",
      });
      return;
    }

    const channel = channels?.find((c) => c.id === values.channelId);
    if (channel?.isDisconnected) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Channel is disconnected",
        message: "Reconnect it in Buffer before posting",
      });
      return;
    }

    // YouTube posts only support video attachments; force it regardless of the field's value
    const effectiveAttachmentType = isYoutube ? "video" : values.attachmentType;

    // Validate media URLs and per-network requirements upfront
    try {
      if (effectiveAttachmentType === "image") {
        validateUrl(values.imageUrl ?? "", "Image URL");
        if (values.imageThumbnailUrl) {
          validateUrl(values.imageThumbnailUrl, "Image thumbnail URL");
        }
      } else if (effectiveAttachmentType === "video") {
        validateUrl(values.videoUrl ?? "", "Video URL");
        if (values.videoThumbnailUrl) {
          validateUrl(values.videoThumbnailUrl, "Video thumbnail URL");
        }
      }

      if (isFacebook) validateFacebook(values, networkContext);
      if (isGoogle) validateGoogleBusiness(values);
      if (isInstagram) validateInstagram(values, networkContext);
      if (isTikTok) validateTiktok(values);
      if (isPinterest) validatePinterest(values);
      if (isMastodon) validateMastodon(values);
      if (isStartPage) validateStartPage(values);
      if (isYoutube && !isYoutubeNotification) validateYoutube(values);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating post\u2026",
    });

    try {
      // Build ordered asset list
      const assets: AssetInput[] = [];

      if (effectiveAttachmentType === "image" && values.imageUrl) {
        const image: ImageAssetInput = { url: values.imageUrl };
        if (values.imageThumbnailUrl) {
          image.thumbnailUrl = values.imageThumbnailUrl;
        }
        if (values.imageAltText) {
          image.metadata = { altText: values.imageAltText };
        }
        assets.push({ image });
      } else if (effectiveAttachmentType === "video" && values.videoUrl) {
        const video: VideoAssetInput = { url: values.videoUrl };
        if (values.videoThumbnailUrl) {
          video.thumbnailUrl = values.videoThumbnailUrl;
        }
        assets.push({ video });
      }

      // Build service-specific metadata
      let metadata: PostMetadata | undefined;

      if (isInstagram) {
        metadata = buildInstagramMetadata(values, networkContext);
      } else if (isFacebook) {
        metadata = buildFacebookMetadata(values, networkContext);
      } else if (isGoogle) {
        metadata = buildGoogleBusinessMetadata(values);
      } else if (isPinterest) {
        metadata = buildPinterestMetadata(values);
      } else if (isYoutube && !isYoutubeNotification) {
        metadata = buildYoutubeMetadata(values);
      }

      const post = await createPost({
        channelId: values.channelId,
        text: values.text || undefined,
        mode: values.mode as PostMode,
        schedulingType: resolvedSchedulingType,
        dueAt:
          values.mode === "customScheduled" && values.dueAt
            ? values.dueAt.toISOString()
            : undefined,
        assets,
        metadata,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Post created";
      toast.message = `Status: ${post.status}`;
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create post";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  function channelTitle(ch: Channel) {
    const service = ch.service.charAt(0).toUpperCase() + ch.service.slice(1);
    const typeLabel = ch.type
      ? ` - ${ch.type.charAt(0).toUpperCase() + ch.type.slice(1)}`
      : "";
    return ch.isDisconnected
      ? `${ch.name} (${service}${typeLabel}) (Disconnected)`
      : `${ch.name} (${service}${typeLabel})`;
  }

  return (
    <Form
      isLoading={isLoading || boardsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Post"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {/* ── Organization ── */}
      {needsOrgPicker && (
        <Form.Dropdown
          id="organizationId"
          title="Organization"
          value={selectedOrg?.id ?? ""}
          onChange={selectOrgById}
        >
          {organizations?.map((org) => (
            <Form.Dropdown.Item key={org.id} value={org.id} title={org.name} />
          ))}
        </Form.Dropdown>
      )}

      {/* ── Channel ── */}
      <Form.Dropdown
        id="channelId"
        title="Channel"
        value={selectedChannelId ?? ""}
        onChange={handleChannelChange}
      >
        {channels?.map((ch) => (
          <Form.Dropdown.Item
            key={ch.id}
            value={ch.id}
            title={channelTitle(ch)}
          />
        ))}
      </Form.Dropdown>

      {/* ── Content ── */}
      <Form.TextArea
        id="text"
        title="Post Text"
        placeholder="What would you like to share?"
        enableMarkdown={false}
      />

      <Form.Separator />

      {/* ── Scheduling ── */}
      <Form.Dropdown
        id="mode"
        title="Share Mode"
        value={mode}
        onChange={(v) => setMode(v as PostMode)}
      >
        {POST_MODES.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={m.title} />
        ))}
      </Form.Dropdown>

      {mode === "customScheduled" && (
        <Form.DatePicker
          id="dueAt"
          title="Schedule For"
          type={Form.DatePicker.Type.DateTime}
        />
      )}

      {showSchedulingType && (
        <Form.Dropdown
          id="schedulingType"
          title="Scheduling Mode"
          value={schedulingType}
          onChange={(v) => setSchedulingType(v as SchedulingType)}
        >
          <Form.Dropdown.Item value="automatic" title="Automatic" />
          <Form.Dropdown.Item
            value="notification"
            title="Notification (manual approval)"
          />
        </Form.Dropdown>
      )}

      {(isFacebookGroup || isInstagramProfile) && (
        <Form.Description text="This channel only supports notification scheduling (manual approval)." />
      )}

      {/* ── Instagram ── */}
      {isInstagram && <InstagramFields isProfile={isInstagramProfile} />}

      {/* ── Facebook ── */}
      {isFacebook && <FacebookFields isGroup={isFacebookGroup} />}

      {/* ── Pinterest ── */}
      {isPinterest && (
        <PinterestFields
          boards={pinterestBoards}
          boardsLoading={boardsLoading}
        />
      )}

      {/* ── YouTube ── */}
      {isYoutube && !isYoutubeNotification && <YoutubeFields />}

      {/* ── Google Business ── */}
      {isGoogle && (
        <GoogleBusinessFields
          postType={googlePostType}
          onPostTypeChange={setGooglePostType}
        />
      )}

      <Form.Separator />

      {/* ── Attachments ── */}
      <Form.Dropdown
        id="attachmentType"
        title="Attachment"
        value={attachmentType}
        onChange={setAttachmentType}
      >
        {allowedAttachments.map((a) => (
          <Form.Dropdown.Item key={a.value} value={a.value} title={a.title} />
        ))}
      </Form.Dropdown>

      {attachmentType === "image" && (
        <>
          <Form.TextField
            id="imageUrl"
            title="Image URL"
            placeholder="https://example.com/image.jpg"
          />
          <Form.TextField
            id="imageAltText"
            title="Alt Text"
            placeholder="Describe the image (optional)"
          />
          <Form.TextField
            id="imageThumbnailUrl"
            title="Thumbnail URL"
            placeholder="https://example.com/thumb.jpg (optional)"
          />
        </>
      )}

      {attachmentType === "video" && (
        <>
          <Form.TextField
            id="videoUrl"
            title="Video URL"
            placeholder="https://example.com/video.mp4"
          />
          <Form.TextField
            id="videoThumbnailUrl"
            title="Thumbnail URL"
            placeholder="https://example.com/thumb.jpg (optional)"
          />
        </>
      )}
    </Form>
  );
}
