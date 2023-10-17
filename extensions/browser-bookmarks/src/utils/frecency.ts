// The algorithm below is inspired by the one used by Firefox:
// https://wiki.mozilla.org/User:Jesse/NewFrecency

export type BookmarkFrecency = {
  lastVisited: number;
  frecency: number;
};

const HALF_LIFE_DAYS = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DECAY_RATE_CONSTANT = Math.log(2) / (HALF_LIFE_DAYS * MS_PER_DAY);

const VISIT_TYPE_POINTS = {
  default: 100,
};

export function getBookmarkFrecency(bookmark?: BookmarkFrecency) {
  const now = new Date().getTime();
  const lastVisited = bookmark ? bookmark.lastVisited : 0;
  const frecency = bookmark ? bookmark.frecency : 0;

  const visitAgeInDays = (now - lastVisited) / MS_PER_DAY;
  const currentVisitValue = VISIT_TYPE_POINTS.default * Math.exp(-DECAY_RATE_CONSTANT * visitAgeInDays);
  const totalVisitValue = frecency + currentVisitValue;

  return {
    ...bookmark,
    lastVisited: now,
    frecency: totalVisitValue,
  };
}
