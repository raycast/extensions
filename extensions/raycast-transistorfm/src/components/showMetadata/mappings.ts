import { IShowData } from "../../interfaces/shows";
import { SHOW_LABELS } from "../../utils/constants";

type Attributes<T> = {
  label: string;
  target?: string | null;
  value?: T;
};

const amazonMusic = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.amazon_music;

  return { label: SHOW_LABELS.amazonMusic, target };
};

const applePodcasts = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.apple_podcasts;

  return { label: SHOW_LABELS.applePodcasts, target };
};

const author = (show: IShowData): Attributes<string> => {
  const value: string = show.attributes.author;

  return { label: SHOW_LABELS.author, value };
};

const castro = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.castro;

  return { label: SHOW_LABELS.castro, target };
};

const categories = (show: IShowData): Attributes<{ category: string; secondaryCategory: string | null }> => {
  const category = show.attributes.category ? show.attributes.category : "No category";

  const secondaryCategory = show.attributes.secondary_category ? show.attributes.secondary_category : null;

  const categories = { category, secondaryCategory };

  const value = categories;

  return { label: SHOW_LABELS.categories, value };
};

function createdAt(show: IShowData): Attributes<string> {
  const label = SHOW_LABELS.createdAt;
  const value = new Date(show.attributes.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return { label, value };
}

const deezer = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.deezer;

  return { label: SHOW_LABELS.deezer, target };
};

const description = (show: IShowData): Attributes<string> => {
  const value = show.attributes.description;

  return { label: SHOW_LABELS.description, value };
};

const explicit = (show: IShowData): Attributes<string> => {
  const value = show.attributes.explicit ? "Yes" : "No";

  return { label: SHOW_LABELS.explicit, value };
};

const googlePodcasts = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.google_podcasts;

  return { label: SHOW_LABELS.googlePodcasts, target };
};

const imageUrl = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.image_url;

  return { label: show.attributes.slug, target };
};

const keywords = (show: IShowData): Attributes<string[]> => {
  const value = show.attributes.keywords.split(",").map(String);

  return { label: SHOW_LABELS.keywords, value };
};

const multipleSeasons = (show: IShowData): Attributes<string | null> => {
  const value = show.attributes.multiple_seasons ? "Yes" : "No";

  return { label: SHOW_LABELS.multipleSeasons, value };
};

const pandora = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.pandora;

  return { label: SHOW_LABELS.pandora, target };
};

const pocketCasts = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.pocket_casts;

  return { label: SHOW_LABELS.pocketCasts, target };
};

const rssFeed = (show: IShowData): Attributes<string> => {
  const target = show.attributes.feed_url;
  const value = "Feed URL";

  return { label: SHOW_LABELS.rssFeed, target, value };
};

const title = (show: IShowData): Attributes<string> => {
  const value = show.attributes.title;

  return { label: SHOW_LABELS.title, value };
};
const visibility = (show: IShowData): Attributes<string> => {
  const value = show.attributes.private ? "Private" : "Public";

  return { label: SHOW_LABELS.private, value };
};

const showType = (show: IShowData): Attributes<string> => {
  const value = show.attributes.show_type.charAt(0).toUpperCase() + show.attributes.show_type.slice(1);

  return { label: SHOW_LABELS.showType, value };
};

const spotify = (show: IShowData): Attributes<string | null> => {
  const target = show.attributes.spotify;

  return { label: SHOW_LABELS.spotify, target };
};

const website = (show: IShowData): Attributes<string> => {
  const target = show.attributes.website;
  const value = "Website URL";

  return { label: SHOW_LABELS.website, target, value };
};

const podcastServices = (show: IShowData) => {
  return [
    amazonMusic(show),
    applePodcasts(show),
    castro(show),
    deezer(show),
    googlePodcasts(show),
    pocketCasts(show),
    spotify(show),
  ];
};

export default {
  amazonMusic,
  applePodcasts,
  author,
  createdAt,
  castro,
  categories,
  deezer,
  description,
  explicit,
  googlePodcasts,
  imageUrl,
  keywords,
  multipleSeasons,
  pandora,
  pocketCasts,
  podcastServices,
  rssFeed,
  title,
  visibility,
  showType,
  spotify,
  website,
};
