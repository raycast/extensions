/* eslint-disable @typescript-eslint/no-explicit-any */

export function formatHitUrl(res: any, homepageUrl: string): void {
  if (!res.hits[0]) return;

  if ("path" in res.hits[0]) {
    res.hits = res.hits.map((hit: any) => {
      hit.url = homepageUrl + hit.path;

      return hit;
    });

    return;
  } else if ("slug" in res.hits[0]) {
    res.hits = res.hits.map((hit: any) => {
      hit.url = homepageUrl + hit.slug;

      return hit;
    });

    return;
  } else if ("url" in res.hits[0]) {
    if (((res.hits[0] as any).url as string).startsWith("http")) {
      return;
    }
    res.hits = res.hits.map((hit: any) => {
      hit.url = homepageUrl + hit.url;

      return hit;
    });

    return;
  } else if ("objectID" in res.hits[0]) {
    res.hits = res.hits.map((hit: any) => {
      hit.url = homepageUrl + hit.objectID;

      return hit;
    });

    return;
  }
}
