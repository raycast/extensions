import type { Application } from "@raycast/api";

export type RankedApplication = {
  application: Application;
  score: number;
};

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/\.app$/u, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function scoreCandidate(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (candidate === query) return 1000;
  if (candidate.startsWith(query)) return 900 - Math.min(candidate.length - query.length, 100);

  const words = candidate.split(" ");
  if (words.some((word) => word === query)) return 850;
  if (words.some((word) => word.startsWith(query))) return 800;

  const includedAt = candidate.indexOf(query);
  if (includedAt >= 0) return 700 - includedAt;

  const compactCandidate = candidate.replace(/ /g, "");
  const compactQuery = query.replace(/ /g, "");
  const distance = levenshteinDistance(compactQuery, compactCandidate);
  const allowedDistance = Math.max(1, Math.floor(compactQuery.length / 3));
  if (distance <= allowedDistance) return 500 - distance * 25;

  let queryIndex = 0;
  for (const character of compactCandidate) {
    if (character === compactQuery[queryIndex]) queryIndex += 1;
    if (queryIndex === compactQuery.length) return 300 - (compactCandidate.length - compactQuery.length);
  }

  return 0;
}

export function rankApplications(applications: Application[], rawQuery: string): RankedApplication[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  return applications
    .map((application) => {
      const names = [application.name, application.localizedName, application.bundleId].filter(
        (value): value is string => Boolean(value),
      );
      const score = Math.max(...names.map((name) => scoreCandidate(query, normalize(name))));
      return { application, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.application.name.localeCompare(right.application.name))
    .filter(
      ({ application }, index, ranked) =>
        ranked.findIndex((item) => item.application.path === application.path) === index,
    )
    .slice(0, 20);
}
