import axios from "axios";
import { FilterType, SearchImageResult, Image, SearchTagResult, Tag, TagImage } from "./type";
import { formatDate, formatSize } from "./util";

export enum SearchType {
  IMAGE = "image",
  TAG = "tag",
}

export async function searchImage(query: {
  q: string;
  type?: string;
  page?: number;
  page_size?: number;
}): Promise<Image[]> {
  const url = "https://hub.docker.com/api/content/v1/products/search";
  try {
    const resp = await axios.get(url, {
      params: query,
      headers: {
        "Search-Version": "v3",
      },
    });
    const result: SearchImageResult = resp.data;
    if (!result.summaries) {
      return Promise.resolve([]);
    }
    result.summaries = result.summaries.map((summary: Image) => {
      if (summary.filter_type === FilterType.OFFICIAL) {
        summary.url = `https://hub.docker.com/_/${summary.slug}`;
      } else {
        summary.url = `https://hub.docker.com/r/${summary.slug}`;
      }
      switch (summary.filter_type) {
        case FilterType.OFFICIAL:
          summary.from = "Official";
          break;
        case FilterType.VERIFIED_PUBLISHER:
          summary.from = "Verified";
          break;
        case FilterType.COMMUNITY:
          summary.from = "Community";
          break;
      }
      return summary;
    });
    return Promise.resolve(result.summaries);
  } catch (err) {
    return Promise.reject(err);
  }
}

export enum TagStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export async function searchTag(
  image: string,
  query: {
    page?: number;
    page_size?: number;
    name?: string;
  }
): Promise<Tag[]> {
  let layer: string;
  if (image.indexOf("/") === -1) {
    layer = `${image}/library/${image}`;
    image = `library/${image}`;
  } else {
    layer = image;
  }
  const url = `https://hub.docker.com/v2/repositories/${image}/tags/`;
  try {
    const resp = await axios.get(url, {
      params: query,
    });
    const result: SearchTagResult = resp.data;
    if (!result.results) {
      return Promise.resolve([]);
    }
    result.results = result.results.filter((tag: Tag) => tag.tag_status === TagStatus.ACTIVE);
    result.results = result.results.map((tag: Tag) => {
      tag.images = tag.images?.filter((i: TagImage) => i.status === TagStatus.ACTIVE);
      tag.images = tag.images?.map((i: TagImage) => {
        i.os_arch = `${i.os}/${i.architecture}`;
        if (i.digest) {
          const digest = i.digest.replace(":", "-");
          i.url = `https://hub.docker.com/layers/${layer}/${tag.name}/images/${digest}`;
        }
        i.sizeHuman = formatSize(i.size);
        return i;
      });
      tag.update_time = formatDate(tag.last_updated);
      return tag;
    });
    return Promise.resolve(result.results);
  } catch (err) {
    return Promise.reject(err);
  }
}
