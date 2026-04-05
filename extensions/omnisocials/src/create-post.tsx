import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  listAccounts,
  listMedia,
  createPost,
  createAndPublishPost,
  uploadMediaFile,
} from "./lib/api";
import { getBaseUrl } from "./lib/preferences";
import type { Account, MediaItem, PostType } from "./lib/types";
import {
  PLATFORM_LABELS,
  POST_TYPES,
  POST_TYPE_LABELS,
  type Platform,
} from "./lib/constants";
import { getPlatformIcon } from "./lib/utils";
import { useWorkspace } from "./lib/useWorkspace";
import { ApiKeyRequiredView } from "./components/api-key-required";

export default function CreatePostCommand() {
  const { isLoading: wsLoading, hasApiKey, navigationTitle } = useWorkspace();
  if (wsLoading) return <Form isLoading />;
  if (!hasApiKey) return <ApiKeyRequiredView />;
  return <CreatePostForm navigationTitle={navigationTitle} />;
}

function CreatePostForm({ navigationTitle }: { navigationTitle?: string }) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [postType, setPostType] = useState<PostType>("post");
  const [isLoading, setIsLoading] = useState(true);
  const [publishOption, setPublishOption] = useState("draft");
  const [mediaSource, setMediaSource] = useState<
    "none" | "file" | "url" | "library"
  >("none");
  const [libraryMedia, setLibraryMedia] = useState<MediaItem[]>([]);
  const baseUrl = getBaseUrl();

  useEffect(() => {
    async function load() {
      try {
        const [accountsRes, mediaRes] = await Promise.all([
          listAccounts(),
          listMedia(50),
        ]);
        setAllAccounts(accountsRes.data);
        setLibraryMedia(mediaRes.data);
        // Pre-select only accounts that support "post" type
        const postAccounts = accountsRes.data.filter((a) =>
          a.content_types.includes("post"),
        );
        setSelectedAccounts(postAccounts.map((a) => a.id));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Filter accounts to only those supporting the selected type
  const filteredAccounts = allAccounts.filter((a) =>
    a.content_types.includes(postType),
  );

  // When type changes, remove incompatible accounts
  function handleTypeChange(newType: string) {
    const type = newType as PostType;
    setPostType(type);
    const supportedIds = new Set(
      allAccounts
        .filter((a) => a.content_types.includes(type))
        .map((a) => a.id),
    );
    setSelectedAccounts((prev) => prev.filter((id) => supportedIds.has(id)));
  }

  async function handleSubmit(values: {
    content: string;
    accounts: string[];
    type: string;
    publishOption: string;
    scheduleAt: Date | null;
    mediaSource: string;
    localFiles: string[];
    mediaUrls: string;
    libraryMedia: string[];
  }) {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
      });
      return;
    }

    if (values.accounts.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one account",
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Creating post..." });

    try {
      // Collect media IDs and URLs
      const mediaIds: string[] = [];
      const mediaUrls: string[] = [];

      // Upload local files first
      if (values.mediaSource === "file" && values.localFiles?.length > 0) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Uploading ${values.localFiles.length} file(s)...`,
        });
        for (const filePath of values.localFiles) {
          const result = await uploadMediaFile(filePath);
          mediaIds.push(result.data.id);
        }
      }

      // Parse external URLs
      if (values.mediaSource === "url" && values.mediaUrls?.trim()) {
        const urls = values.mediaUrls
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0);
        mediaUrls.push(...urls);
      }

      // Add library media IDs
      if (values.mediaSource === "library" && values.libraryMedia?.length > 0) {
        mediaIds.push(...values.libraryMedia);
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Creating post...",
      });

      const postData = {
        content: { default: values.content },
        accounts: values.accounts,
        type: values.type as PostType,
        ...(mediaIds.length > 0 ? { media: mediaIds } : {}),
        ...(mediaUrls.length > 0 ? { media_urls: mediaUrls } : {}),
      };

      if (values.publishOption === "now") {
        await createAndPublishPost(postData);
        await showToast({
          style: Toast.Style.Success,
          title: "Post published!",
        });
      } else if (values.publishOption === "schedule" && values.scheduleAt) {
        await createPost({
          ...postData,
          schedule_at: values.scheduleAt.toISOString(),
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Post scheduled!",
        });
      } else {
        await createPost(postData);
        await showToast({ style: Toast.Style.Success, title: "Draft saved!" });
      }

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create post",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function getAccountLabel(account: Account): string {
    const platformLabel =
      PLATFORM_LABELS[account.platform as Platform] || account.platform;
    const name = account.display_name || account.username;
    return name ? `${name} (${platformLabel})` : platformLabel;
  }

  function getMediaLabel(media: MediaItem): string {
    const type = media.type === "video" ? "Video" : "Image";
    const size = media.size
      ? ` (${(media.size / 1024 / 1024).toFixed(1)}MB)`
      : "";
    return `${media.filename || "Untitled"} - ${type}${size}`;
  }

  // Filter library media by type compatibility
  const filteredLibraryMedia = libraryMedia.filter((m) => {
    if (postType === "reel") return m.type === "video";
    return true; // posts and stories can use images or videos
  });

  return (
    <Form
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Post"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser title="Open OmniSocials" url={baseUrl} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What's on your mind?"
        autoFocus
      />

      <Form.Dropdown
        id="type"
        title="Type"
        value={postType}
        onChange={handleTypeChange}
      >
        {POST_TYPES.map((type) => (
          <Form.Dropdown.Item
            key={type}
            value={type}
            title={POST_TYPE_LABELS[type]}
            icon={
              type === "post"
                ? Icon.Document
                : type === "story"
                  ? Icon.Camera
                  : Icon.Video
            }
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="accounts"
        title="Accounts"
        value={selectedAccounts}
        onChange={setSelectedAccounts}
      >
        {filteredAccounts.map((account) => (
          <Form.TagPicker.Item
            key={account.id}
            value={account.id}
            title={getAccountLabel(account)}
            icon={getPlatformIcon(account.platform)}
          />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      <Form.Dropdown
        id="mediaSource"
        title="Media"
        value={mediaSource}
        onChange={(v) => setMediaSource(v as typeof mediaSource)}
      >
        <Form.Dropdown.Item value="none" title="No Media" icon={Icon.Minus} />
        <Form.Dropdown.Item
          value="file"
          title="Upload from Mac"
          icon={Icon.Upload}
        />
        <Form.Dropdown.Item value="url" title="From URL" icon={Icon.Link} />
        <Form.Dropdown.Item
          value="library"
          title="From Media Library"
          icon={Icon.Image}
        />
      </Form.Dropdown>

      {mediaSource === "file" && (
        <Form.FilePicker
          id="localFiles"
          title="Files"
          allowMultipleSelection
          canChooseDirectories={false}
        />
      )}

      {mediaSource === "url" && (
        <Form.TextArea
          id="mediaUrls"
          title="Media URLs"
          placeholder={
            "Paste image or video URLs (one per line)\nhttps://example.com/photo.jpg"
          }
        />
      )}

      {mediaSource === "library" && (
        <Form.TagPicker id="libraryMedia" title="Library">
          {filteredLibraryMedia.map((media) => (
            <Form.TagPicker.Item
              key={media.id}
              value={media.id}
              title={getMediaLabel(media)}
              icon={media.type === "video" ? Icon.Video : Icon.Image}
            />
          ))}
        </Form.TagPicker>
      )}

      <Form.Separator />

      <Form.Dropdown
        id="publishOption"
        title="Publish"
        value={publishOption}
        onChange={setPublishOption}
      >
        <Form.Dropdown.Item
          value="draft"
          title="Save as Draft"
          icon={Icon.Pencil}
        />
        <Form.Dropdown.Item
          value="now"
          title="Publish Now"
          icon={Icon.Upload}
        />
        <Form.Dropdown.Item
          value="schedule"
          title="Schedule"
          icon={Icon.Clock}
        />
      </Form.Dropdown>

      {publishOption === "schedule" && (
        <Form.DatePicker
          id="scheduleAt"
          title="Schedule Date"
          type={Form.DatePicker.Type.DateTime}
        />
      )}
    </Form>
  );
}
