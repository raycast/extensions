import type { Hit } from "../src/digup/protocol";

/** As `digup search-service` 0.6.1 printed them. */
export const RAW_IMAGE_HIT = {
  cosine: 0.7589632272720337,
  info: { height: "768", width: "768" },
  keyword_rank: 1,
  kind: "image",
  modified: 1791835808.4140496,
  path: "/Users/sam/Samples/photos/Animals-Penguin.jpg",
  score: 5.320931624136898,
  segment: "image",
  segment_id: 68,
  size: 56906,
  z: 3.3209316241368976,
};

export const RAW_CODE_HIT = {
  cosine: 0.8133012056350708,
  excerpt: '…«failing»."""\nimport functools\ndef «retry»_with_«backoff»(attem',
  focus: 8,
  info: { lines: "63", repo: "/Users/sam/Samples/code/billing-service" },
  keyword_rank: 1,
  kind: "code",
  loc: 1,
  loc_end: 33,
  modified: 1791836225.4225814,
  path: "/Users/sam/Samples/code/billing-service/billing/retry.py",
  score: 4.1808530952382075,
  segment: "lines",
  segment_id: 77,
  size: 2193,
  z: 3.180853095238207,
};

export function hit(overrides: Partial<Hit> = {}): Hit {
  return {
    path: "/Users/sam/Documents/lease.pdf",
    kind: "pdf",
    segment: "page",
    segmentId: 1,
    score: 1,
    modified: 1791835808,
    size: 2048,
    info: {},
    ...overrides,
  };
}
