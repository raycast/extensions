/* eslint-disable @typescript-eslint/no-explicit-any */
import { getContentIcon } from "../util/icons";
import { apiAuthorize } from "./auth";
import { Site } from "./site";
import { get } from "./util";

const escCql = (s: string) => s.replace(`\\`, `\\\\`).replace(/"/g, `\\"`);

function parseDate(date?: string) {
  return date ? new Date(date) : undefined;
}

export async function fetchHydratedPopularFeed(site: Site): Promise<Content[]> {
  const popularContent = (await fetchPopularFeed(site)) as PopularResponse;
  if (!popularContent.nodes.length) return [];
  const contentIds = popularContent.nodes.map((i: any) => i.id);
  const cql = `content in (${contentIds.join(",")})`;
  const expand = "content.metadata.currentuser.viewed,content.metadata.likes,content.children.comment,content.history";
  const response = await fetchSearchByCql(site, cql, undefined, expand);
  return contentIds.map((id) => {
    const item = response.results.find((item) => item.content.id === id);

    return {
      id: item.content.id,
      title: item.content.title,
      spaceTitle: item.resultGlobalContainer.title,
      type: item.content.type,
      lastModifiedAt: new Date(item.lastModified),
      lastModifiedAtFriendly: item.friendlyLastModified,
      lastSeenAt: parseDate(item.content.metadata.currentuser.viewed?.lastSeen),
      lastSeenAtFriendly: item.content.metadata.currentuser.viewed?.friendlyLastSeen,
      url: response._links.base + item.url,
      likesCount: item.content.metadata.likes.count,
      commentCount: item.content.children.comment.size,
      createdBy: {
        name: item.content.history.createdBy.displayName,
        profilePicture: site.url + item.content.history.createdBy.profilePicture.path,
      },
    };
  });
}

export async function fetchSearchByCql(site: Site, cql: string, signal?: AbortSignal, expand?: string, limit?: number) {
  await apiAuthorize();
  const url = new URL(`https://api.atlassian.com/ex/confluence/${site.id}/rest/api/search`);

  url.searchParams.append("cql", cql);
  if (expand) {
    url.searchParams.append("expand", expand);
  }
  if (limit) {
    url.searchParams.append("limit", String(limit));
  }

  const json = await get(url.href, signal);
  return json as CqlResponse;
}

interface CqlResponse {
  results: any[];
  _links: any;
}

// TODO - note that this API isn't publicly doc'd,but should be. Add to list of things to 'make this possible without 1p'
// Also scopes are weird, and API response sucks
export async function fetchPopularFeed(site: Site, limit = 25) {
  await apiAuthorize();
  return get(
    `https://api.atlassian.com/ex/confluence/${site.id}/analytics/rest/cloud/${site.id}/feed/popular?first=${limit}`,
  );
}

export async function fetchSpaces(site: Site, text: string, signal?: AbortSignal) {
  const cql = `type = space and title ~ "${escCql(text)}"`;
  return fetchSearchByCql(site, cql, signal);
}

export async function fetchUsers(site: Site, text: string, signal?: AbortSignal) {
  let cql = `type = user`;

  if (text?.length > 0) {
    cql = `${cql} and user.fullname~"${escCql(text)}"`;
  }
  return fetchSearchByCql(site, cql, signal, undefined, 500);
}

export async function fetchFavouriteSpaces(site: Site) {
  await apiAuthorize();
  const url = new URL(`https://api.atlassian.com/ex/confluence/${site.id}/rest/api/space`);

  url.searchParams.append("favourite", "true");
  const json = await get(url.href);
  return json;
}

export const SEARCH_EXPAND = [
  "content.version.by",
  "content.metadata.currentuser.viewed",
  "content.metadata.currentuser.favourited",
  "content.metadata.likes",
  "content.metadata.mediaType",
].join(",");

function withCQLSpace(search: string, spaceKey?: string, sort?: string): string {
  if (spaceKey) {
    return search + ` and space.key = "${escCql(spaceKey)}"`;
  }
  if (sort) {
    return search + ` order by ${sort}`;
  }
  return search;
}

export async function fetchSearchByText(searchOptions: SearchOptions, signal?: AbortSignal) {
  const { site, spaceKey, text, includeAttachments = false, sort } = searchOptions;
  const types = includeAttachments ? "blogpost,page,attachment" : "blogpost,page";
  const cql = withCQLSpace(`type IN (${types}) and siteSearch ~ "${escCql(text)}"`, spaceKey, sort);
  return fetchSearchByCql(site, cql, signal, SEARCH_EXPAND);
}

export function sortByLastViewed(recentItems: SearchResult[]) {
  return [...recentItems].sort((a: SearchResult, b: SearchResult) => b.lastSeenAt.valueOf() - a.lastSeenAt.valueOf());
}

export async function fetchRecentlyViewed(site: Site, spaceKey?: string, signal?: AbortSignal) {
  const cql = withCQLSpace("id in recentlyViewedContent(100)", spaceKey);
  return fetchSearchByCql(site, cql, signal, SEARCH_EXPAND, 100);
}

export function mapToSearchResult(item: any, links: any): SearchResult {
  const authorPicture = `${links.base.replace(links.context, "")}${item.content.version.by.profilePicture.path}`;
  const result: SearchResult = {
    id: item.content.id,
    title: item.content.title,
    space: item.resultGlobalContainer.title,
    type: item.content.type,
    icon: getContentIcon(item.content.type, item.content?.metadata?.mediaType as string),
    modifiedAt: new Date(item.lastModified),
    modifiedAtFriendly: item.friendlyLastModified,
    lastSeenAt:
      item.content.metadata?.currentuser?.viewed && new Date(item.content.metadata?.currentuser?.viewed?.lastSeen),
    lastSeenAtFriendly: item.content.metadata?.currentuser?.viewed?.friendlyLastSeen,
    url: links.base + item.url,
    editUrl: links.base + "/pages/editpage.action?pageId=" + item.content.id,
    author: {
      name: item.content.version.by.displayName as string,
      profilePicture: authorPicture,
    },
  };

  if (item.content.metadata?.likes) {
    result.likes = {
      currentUser: item.content.metadata?.likes?.currentUser || false,
      count: item.content.metadata?.likes?.count,
    };
  }
  if (item.content.metadata?.currentuser?.favourited) {
    result.favourite = {
      isFavourite: item.content.metadata?.currentuser?.favourited.isFavourite || false,
      favouritedDate: new Date(item.content.metadata?.currentuser?.favourited.favouritedDate),
    };
  }
  return result;
}

export function generateBrowserUrl(site: Site, searchText: string, spaceFilter: string): string | undefined {
  if (!site.url) return;
  if (!searchText) return generateBrowserRecentUrl(site);
  return generateBrowserSearchUrl(site, searchText, spaceFilter);
}

export function generateBrowserRecentUrl(site: Site): string {
  const directUrl = new URL("/wiki/home/recent", site.url);
  return directUrl.toString();
}

export function generateBrowserSearchUrl(site: Site, searchText: string, spaceFilter: string): string {
  const directUrl = new URL("/wiki/search", site.url);
  directUrl.searchParams.set("text", searchText);
  if (spaceFilter) directUrl.searchParams.set("spaces", spaceFilter);
  return directUrl.toString();
}

export interface Content {
  id: string;
  title: string;
  spaceTitle: string;
  type: string;
  lastModifiedAt: Date;
  lastModifiedAtFriendly: string;
  lastSeenAt?: Date;
  lastSeenAtFriendly?: string;
  url: string;
  likesCount: number;
  commentCount: number;
  createdBy: {
    name: string;
    profilePicture: string;
  };
}

export interface PopularResponse {
  nodes: { id: string }[];
  pageInfo: any;
}

export interface SearchResult {
  id: string;
  title: string;
  space?: string;
  type: string;
  icon: string;
  modifiedAt: Date;
  modifiedAtFriendly: string;
  lastSeenAt: Date;
  lastSeenAtFriendly: string;
  url: string;
  editUrl?: string;
  likes?: {
    currentUser: boolean;
    count: number;
  };
  author?: {
    name: string;
    profilePicture: string;
  };
  favourite?: {
    isFavourite: boolean;
    favouritedDate: Date;
  };
}

export interface SearchOptions {
  site: Site;
  text: string;
  includeAttachments?: boolean;
  spaceKey?: string;
  sort?: string;
}
