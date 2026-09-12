export interface TimeInterval {
  start: number;
  end: number;
}

export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];
  const [first, ...rest] = [...intervals].toSorted((a, b) => a.start - b.start);

  return rest.reduce<TimeInterval[]>(
    (merged, current) => {
      const last = merged[merged.length - 1];
      return current.start <= last.end
        ? [...merged.slice(0, -1), { start: last.start, end: Math.max(last.end, current.end) }]
        : [...merged, current];
    },
    [first],
  );
}

export function subtractIntervals(interval: TimeInterval, exclusion: TimeInterval[]): TimeInterval[] {
  return exclusion
    .reduce((intervals, exclusion) => intervals.flatMap(subtractExclusion(exclusion).fromInterval), [interval])
    .filter((fragment) => fragment.end > fragment.start);
}

const subtractExclusion = (exclusion: TimeInterval) => {
  return {
    fromInterval: (interval: TimeInterval): TimeInterval[] => {
      if (exclusion.end <= interval.start || exclusion.start >= interval.end) return [interval];

      return [
        ...(exclusion.start > interval.start ? [{ start: interval.start, end: exclusion.start }] : []),
        ...(exclusion.end < interval.end ? [{ start: exclusion.end, end: interval.end }] : []),
      ];
    },
  };
};
