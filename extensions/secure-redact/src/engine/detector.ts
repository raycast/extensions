import { Detection, DetectionPolicy, ThreatFeed } from "../types";
import { patterns } from "./patterns";
import { getPolicyCategories } from "./policies";

export function detectSensitiveData(
  text: string,
  policy: DetectionPolicy,
  feeds: ThreatFeed[] = []
): Detection[] {
  const allowedCategories = getPolicyCategories(policy);
  const detections: Detection[] = [];

  for (const pattern of patterns) {
    if (!allowedCategories.includes(pattern.category)) {
      continue;
    }

    const matches = text.matchAll(pattern.pattern);
    for (const match of matches) {
      if (match.index === undefined) continue;

      const value = match[0];
      const isValid = pattern.validator ? pattern.validator(value) : true;

      if (isValid) {
        detections.push({
          type: pattern.name,
          value,
          start: match.index,
          end: match.index + value.length,
          confidence: 1.0,
        });
      }
    }
  }

  const enabledFeeds = feeds.filter((feed) => feed.enabled);
  for (const feed of enabledFeeds) {
    for (const feedPattern of feed.patterns) {
      try {
        const regex = new RegExp(feedPattern, "gi");
        const matches = text.matchAll(regex);
        for (const match of matches) {
          if (match.index === undefined) continue;

          const value = match[0];
          detections.push({
            type: "MALICIOUS_URL",
            value,
            start: match.index,
            end: match.index + value.length,
            confidence: 1.0,
          });
        }
      } catch {
        // Invalid regex in feed, skip
      }
    }
  }

  return resolveOverlaps(detections);
}

function resolveOverlaps(detections: Detection[]): Detection[] {
  if (detections.length <= 1) return detections;

  const sorted = [...detections].sort((a, b) => a.start - b.start);
  const resolved: Detection[] = [];

  for (const detection of sorted) {
    const hasOverlap = resolved.some(
      (existing) =>
        detection.start < existing.end && detection.end > existing.start
    );

    if (!hasOverlap) {
      resolved.push(detection);
    } else {
      const overlapping = resolved.filter(
        (existing) =>
          detection.start < existing.end && detection.end > existing.start
      );

      const longestOverlap = overlapping.reduce((longest, current) =>
        current.end - current.start > longest.end - longest.start
          ? current
          : longest
      );

      if (
        detection.end - detection.start >
        longestOverlap.end - longestOverlap.start
      ) {
        const index = resolved.indexOf(longestOverlap);
        resolved.splice(index, 1);
        resolved.push(detection);
      }
    }
  }

  return resolved.sort((a, b) => a.start - b.start);
}
