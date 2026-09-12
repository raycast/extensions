import { IEpisodeData } from "../../interfaces/episodes";
import { EPISODE_LABELS } from "../../utils/constants";

type Attributes<T> = {
  label: string;
  target?: string | null;
  value?: T;
};

const author = (episode: IEpisodeData): Attributes<string> => {
  const value: string = episode.attributes.author;

  return { label: EPISODE_LABELS.author, value };
};

function createdAt(episode: IEpisodeData): Attributes<string> {
  const value = new Date(episode.attributes.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return { label: EPISODE_LABELS.createdAt, value };
}

const description = (episode: IEpisodeData): Attributes<string> => {
  const value = episode.attributes.description;

  return { label: EPISODE_LABELS.description, value };
};

const duration = (episode: IEpisodeData): Attributes<number> => {
  const value = episode.attributes.duration;

  return { label: EPISODE_LABELS.duration, value };
};

const explicit = (episode: IEpisodeData): Attributes<string> => {
  const value = episode.attributes.explicit ? "Yes" : "No";

  return { label: EPISODE_LABELS.explicit, value };
};

const keywords = (episode: IEpisodeData): Attributes<string[]> => {
  const value = episode.attributes.keywords.split(",").map(String);

  return { label: EPISODE_LABELS.keywords, value };
};

const publishedAt = (episode: IEpisodeData): Attributes<string | null> => {
  const value = new Date(episode.attributes.published_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return { label: EPISODE_LABELS.publishedAt, value };
};

const number = (episode: IEpisodeData): Attributes<number> => {
  const value = episode.attributes.number;

  return { label: EPISODE_LABELS.number, value };
};

const season = (episode: IEpisodeData): Attributes<number> => {
  const value = episode.attributes.season;

  return { label: EPISODE_LABELS.season, value };
};

const shareUrl = (episode: IEpisodeData): Attributes<string | null> => {
  const target = episode.attributes.share_url;

  return { label: EPISODE_LABELS.shareUrl, target };
};

const status = (episode: IEpisodeData): Attributes<string> => {
  const value = episode.attributes.status.charAt(0).toUpperCase() + episode.attributes.status.slice(1);

  return { label: EPISODE_LABELS.status, value };
};

const title = (episode: IEpisodeData): Attributes<string> => {
  const value = episode.attributes.title;

  return { label: EPISODE_LABELS.title, value };
};

const transcriptUrl = (episode: IEpisodeData): Attributes<string> => {
  const target = episode.attributes.transcript_url;

  return { label: EPISODE_LABELS.transcriptUrl, target };
};

const type = (episode: IEpisodeData): Attributes<string> => {
  const value = episode.attributes.type.charAt(0).toUpperCase() + episode.attributes.type.slice(1);

  return { label: EPISODE_LABELS.type, value };
};

export default {
  author,
  createdAt,
  description,
  duration,
  explicit,
  keywords,
  publishedAt,
  number,
  season,
  shareUrl,
  status,
  transcriptUrl,
  type,
  title,
};
