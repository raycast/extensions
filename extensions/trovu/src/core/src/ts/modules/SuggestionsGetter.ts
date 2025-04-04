/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/** @module SuggestionsGetter */
import QueryParser from "./QueryParser";
import escapeStringRegexp from "escape-string-regexp";

export default class SuggestionsGetter {
  constructor(env) {
    this.env = env;
  }

  /**
   * Find shortcuts to suggest.
   *
   * @param {string} keyword – The keyword from the query.
   *
   * @return {array} suggestions – The found suggestions.
   */
  getSuggestions(query) {
    if (!query) {
      return [];
    }
    const matches = this.getMatches(query);

    if (matches.showOnHome.length > 0) {
      // sort matches.showOnHome by showOnHome integer
      matches.showOnHome.sort((a, b) => {
        return a.showOnHome - b.showOnHome;
      });
      return matches.showOnHome;
    }

    this.sort(matches);
    let suggestions = [];
    suggestions = suggestions.concat(
      matches.showOnHome,
      matches.keywordFullReachable,
      matches.keywordFullUnreachable,
      matches.keywordBeginReachable,
      matches.keywordBeginUnreachable,
      matches.titleBeginReachable,
      matches.titleBeginUnreachable,
      matches.titleMiddleReachable,
      matches.titleMiddleUnreachable,
      matches.tagMiddleReachable,
      matches.tagMiddleUnreachable,
      matches.urlMiddleReachable,
      matches.urlMiddleUnreachable,
    );

    // Remove duplicates.
    const map = new Map();
    suggestions = suggestions.filter((item) => {
      const key = `${item.namespace}.${item.keyword} ${item.argumentCount}`;
      if (!map.has(key)) {
        map.set(key, true); // set any value to Map
        return true;
      }
      return false;
    });

    return suggestions;
  }

  /**
   * Find matches given keyword.
   *
   * @param {string} keyword – The keyword from the query.
   *
   * @return {object} matches – The found matches, grouped by type of match.
   */
  getMatches(query) {
    const matches = {
      showOnHome: [],
      keywordFullReachable: [],
      keywordFullUnreachable: [],
      keywordBeginReachable: [],
      keywordBeginUnreachable: [],
      titleBeginReachable: [],
      titleBeginUnreachable: [],
      titleMiddleReachable: [],
      titleMiddleUnreachable: [],
      tagMiddleReachable: [],
      tagMiddleUnreachable: [],
      urlMiddleReachable: [],
      urlMiddleUnreachable: [],
    };
    const env = QueryParser.parse(query);
    const [regExp, filters] = this.getRegExpAndFilters(query);

    for (const namespaceInfo of Object.values(this.env.namespaceInfos)) {
      if (!namespaceInfo.shortcuts) {
        continue;
      }
      for (const shortcut of Object.values(namespaceInfo.shortcuts)) {
        if (shortcut.deprecated || shortcut.removed) {
          continue;
        }
        delete shortcut.includes;
        delete shortcut.tests;
        if (query == "") {
          if (shortcut.showOnHome && shortcut.reachable) {
            matches.showOnHome.push(shortcut);
            continue;
          }
        }
        if (filters.namespace && filters.namespace != shortcut.namespace) {
          continue;
        }
        if (filters.tag && (!shortcut.tags || !shortcut.tags.includes(filters.tag))) {
          continue;
        }
        if (filters.url && !shortcut.url.includes(filters.url)) {
          continue;
        }
        if (env.keyword == shortcut.keyword) {
          if (shortcut.reachable) {
            matches.keywordFullReachable.push(shortcut);
          } else {
            matches.keywordFullUnreachable.push(shortcut);
          }
          continue;
        }
        let pos = shortcut.keyword.search(regExp);
        if (pos == 0) {
          if (shortcut.reachable) {
            matches.keywordBeginReachable.push(shortcut);
          } else {
            matches.keywordBeginUnreachable.push(shortcut);
          }
          continue;
        }
        pos = shortcut.title.search(regExp);
        if (pos == 0) {
          if (shortcut.reachable) {
            matches.titleBeginReachable.push(shortcut);
          } else {
            matches.titleBeginUnreachable.push(shortcut);
          }
          continue;
        }
        if (pos > 0) {
          if (shortcut.reachable) {
            matches.titleMiddleReachable.push(shortcut);
          } else {
            matches.titleMiddleUnreachable.push(shortcut);
          }
          continue;
        }
        if (shortcut.tags && Array.isArray(shortcut.tags)) {
          for (const tag of shortcut.tags) {
            const pos = tag.search(regExp);
            if (pos > -1) {
              if (shortcut.reachable) {
                matches.tagMiddleReachable.push(shortcut);
              } else {
                matches.tagMiddleUnreachable.push(shortcut);
              }
            }
          }
        }
        pos = shortcut.url.search(regExp);
        if (pos > 0) {
          if (shortcut.reachable) {
            matches.urlMiddleReachable.push(shortcut);
          } else {
            matches.urlMiddleUnreachable.push(shortcut);
          }
          continue;
        }
      }
    }
    return matches;
  }

  getRegExpAndFilters(query) {
    const filters = {};
    const queryParts = query.split(" ");
    const remainingQueryParts = [];
    for (const part of queryParts) {
      if (part.startsWith("ns:")) {
        filters.namespace = part.slice(3);
        continue;
      }
      if (part.startsWith("tag:")) {
        filters.tag = part.slice(4);
        continue;
      }
      if (part.startsWith("url:")) {
        filters.url = part.slice(4);
        continue;
      }
      const [extraNamespaceName, keyword] = QueryParser.getExtraNamespace(part);
      // If the extraNamespaceName actually exists, use it as a namespace filter.
      if (extraNamespaceName && this.env.namespaceInfos[extraNamespaceName]) {
        filters.namespace = extraNamespaceName;
        remainingQueryParts.push(keyword);
        continue;
      }
      remainingQueryParts.push(part);
    }
    const remainingQuery = remainingQueryParts.join(" ");
    const remainingQueryEscaped = escapeStringRegexp(remainingQuery);
    const regexp = new RegExp(remainingQueryEscaped, "i");
    return [regexp, filters];
  }

  /**
   * Sort matches based on keyword.
   *
   * @param {string} keyword – The keyword from the query.
   */
  sort(matches) {
    const compareKeywords = (a, b) => a.keyword.localeCompare(b.keyword);
    for (const key in matches) {
      matches[key].sort(compareKeywords);
    }
  }
}
