/* eslint-disable @typescript-eslint/no-explicit-any */

export function formatHitUrl(res: any, homepageUrl: string) {
  if (res.hits[0]) {
    if ("path" in res.hits[0]) {
      res.hits = res.hits.map((hit: any) => {
        hit.url = homepageUrl + hit.path;

        return hit;
      });
    } else if ("slug" in res.hits[0]) {
      res.hits = res.hits.map((hit: any) => {
        hit.url = homepageUrl + hit.slug;

        return hit;
      });
    } else if ("url" in res.hits[0] && !((res.hits[0] as any).url as string).startsWith("http")) {
      res.hits = res.hits.map((hit: any) => {
        hit.url = homepageUrl + hit.url;

        return hit;
      });
    }
  }
}
