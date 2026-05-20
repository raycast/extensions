export function getSearchTerms(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function includesAllSearchTerms(result: SearchResult, terms: string[]) {
  const searchableText = getSearchableText(result);

  return terms.every((term) => searchableText.includes(term));
}

export function scoreSearchResult(result: SearchResult, terms: string[]) {
  const title = result.title.toLowerCase();
  const searchableText = getSearchableText(result);

  return terms.reduce((score, term) => {
    if (title === term) {
      return score + 100;
    }

    if (title.startsWith(term)) {
      return score + 50;
    }

    if (title.includes(term)) {
      return score + 20;
    }

    if (searchableText.includes(term)) {
      return score + 5;
    }

    return score;
  }, 0);
}

function getSearchableText(result: SearchResult) {
  return [result.title, result.description, result.platform.join(" "), result.breadcrumbs.join(" ")]
    .join(" ")
    .toLowerCase();
}
