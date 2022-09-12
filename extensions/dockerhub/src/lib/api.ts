import axios from "axios";
import { DockerImage, FilterType, SearchImageResult, SearchTagResult, Tag, TagImage } from "./type";
import { formatDate, formatSize } from "./util";

export async function searchImage(
  query: { q: string; page?: number; page_size?: number },
  signal?: AbortSignal
): Promise<DockerImage[]> {
  const url = "https://hub.docker.com/api/content/v1/products/search";

  const resp = await axios.get(url, {
    params: query,
    headers: {
      "Search-Version": "v3",
    },
    signal,
  });

  const result: SearchImageResult = resp.data;

  if (!result.summaries) {
    return [];
  }
  result.summaries = result.summaries.map((summary: DockerImage) => {
    if (summary.filter_type === FilterType.OFFICIAL) {
      summary.url = `https://hub.docker.com/_/${summary.slug}`;
    } else {
      summary.url = `https://hub.docker.com/r/${summary.slug}`;
    }

    summary.from = summary.filter_type.replace("_", " ").toUpperCase();
    return summary;
  });
  return result.summaries;
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
  },
  signal?: AbortSignal
): Promise<Tag[]> {
  let layer: string;
  if (image.indexOf("/") === -1) {
    layer = `${image}/library/${image}`;
    image = `library/${image}`;
  } else {
    layer = image;
  }
  const url = `https://hub.docker.com/v2/repositories/${image}/tags/`;

  const resp = await axios.get(url, {
    params: query,
    signal,
  });

  const result: SearchTagResult = resp.data;
  if (!result.results) {
    return [];
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

  return result.results;
}
