import type {
  YoutubeLicense,
  YoutubeMetadata,
  YoutubePrivacy,
} from "../api/types";
import type { AttachmentRule, PostFormValues } from "./types";

export const youtubeAttachmentRule: AttachmentRule = { allowed: ["video"] };

export const YOUTUBE_CATEGORIES: { value: string; title: string }[] = [
  { value: "1", title: "Film & Animation" },
  { value: "2", title: "Autos & Vehicles" },
  { value: "10", title: "Music" },
  { value: "15", title: "Pets & Animals" },
  { value: "17", title: "Sports" },
  { value: "19", title: "Travel & Events" },
  { value: "20", title: "Gaming" },
  { value: "22", title: "People & Blogs" },
  { value: "23", title: "Comedy" },
  { value: "24", title: "Entertainment" },
  { value: "25", title: "News & Politics" },
  { value: "26", title: "Howto & Style" },
  { value: "27", title: "Education" },
  { value: "28", title: "Science & Technology" },
  { value: "29", title: "Nonprofits & Activism" },
];

export function validateYoutube(values: PostFormValues): void {
  if (!values.youtubeTitle?.trim()) {
    throw new Error(
      'YouTube posts require a title. Please set the "YouTube Title" field.',
    );
  }
}

export function buildYoutubeMetadata(values: PostFormValues) {
  const youtube: YoutubeMetadata = {
    title: values.youtubeTitle ?? "",
    categoryId: values.youtubeCategoryId ?? "22",
    privacy: (values.youtubePrivacy as YoutubePrivacy) ?? "public",
    license: (values.youtubeLicense as YoutubeLicense) ?? "youtube",
    madeForKids: values.youtubeMadeForKids ?? false,
    embeddable: values.youtubeEmbeddable ?? true,
    notifySubscribers: values.youtubeNotifySubscribers ?? true,
  };
  return { youtube };
}
