import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Logtail } from "../lib/logtail";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

export type CustomMetadataTag = {
  key: string;
  label: string;
  color?: string;
};

export type UseMetadataTagsResult = UseCachedPromiseReturnType<CustomMetadataTag[], undefined> & {
  setMetadataTags: (tags: CustomMetadataTag[]) => Promise<void>;
  addMetadataTag: (tag: CustomMetadataTag) => Promise<void>;
  updateMetadataTag: (tag: CustomMetadataTag) => Promise<void>;
  removeMetadataTag: (key: string) => Promise<void>;
  isExistingTag: (key: string) => boolean;
};

export const useMetadataTags = (): UseMetadataTagsResult => {
  const result = useCachedPromise(() => LocalStorage.getItem<string>(Logtail.METADATA_TAGS_CACHE_KEY));
  let tags: CustomMetadataTag[] = [];

  const setMetadataTags = async (tags: CustomMetadataTag[]) => {
    await LocalStorage.setItem(Logtail.METADATA_TAGS_CACHE_KEY, JSON.stringify(tags));
  };

  const addMetadataTag = async (tag: CustomMetadataTag) => {
    await setMetadataTags([...tags, tag]);
  };

  const removeMetadataTag = async (key: string) => {
    await setMetadataTags(tags.filter((t) => t.key !== key));
  };

  const updateMetadataTag = async (tag: CustomMetadataTag) => {
    await setMetadataTags(tags.map((t) => (t.key !== tag.key ? t : tag)));
  };

  const isExistingTag = (key: string) => {
    return tags.some((t) => t.key === key);
  };

  const helpers = {
    setMetadataTags,
    addMetadataTag,
    removeMetadataTag,
    updateMetadataTag,
    isExistingTag,
  };
  try {
    tags = result.data ? (JSON.parse(result.data) as CustomMetadataTag[]) : [];

    return { ...result, ...helpers, data: tags } as UseMetadataTagsResult;
  } catch (error) {
    return {
      ...result,
      ...helpers,
      data: [],
    } as UseMetadataTagsResult;
  }
};
