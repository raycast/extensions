import { Collection, PageEntity, PageInfo, SublimeCard, UserInfo } from "./types";
import { apiUrl } from "./constants";
import fetch from "node-fetch";
import { FormData, File } from "formdata-node";
import fs from "fs/promises";
import { getApiToken, logOut } from "./auth";

async function fetchApi(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    args: { json?: any; searchParams?: any } = {},
    requireAuth = true,
): Promise<any> {
    const apiToken = await getApiToken();
    if (!apiToken && requireAuth) {
        throw new Error(`API token not available for API call ${method} ${path}`);
    }

    if (args.searchParams) {
        // Filter out undefined values
        Object.keys(args.searchParams).forEach(
            (key) => args.searchParams[key] === undefined && delete args.searchParams[key],
        );

        path += "?" + new URLSearchParams(args.searchParams);
    }

    const response = await fetch(`${apiUrl}/${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
        },
        body: args.json ? JSON.stringify(args.json) : undefined,
    });
    if (!response.ok) {
        const responseText = await response.text();

        if (responseText.includes("Invalid auth token")) {
            await logOut();
        }

        // @ts-ignore
        throw new HTTPError(method, path, args, response, responseText.slice(0, 1000));
    }

    const responseType = response.headers.get("content-type");
    if (responseType === "application/json") {
        const json = await response.json();

        return json;
    } else {
        return undefined;
    }
}

class HTTPError extends Error {
    response: Response;

    constructor(method: string, url: string, request: any, response: Response, responseText: string) {
        super(`${method} ${url} failed with HTTP ${response.status}:\n${JSON.stringify(request)}\n${responseText}`);
        this.response = response;
    }
}
export class FreemiumLimitReachedError extends Error {}

export async function getActiveUserInfo(): Promise<UserInfo> {
    return await fetchApi("GET", `v2/settings/profile/`);
}

export async function searchSublimeCards(
    query: string,
    restrictToLibrary: boolean,
    entityType?: string,
    orderBy?: string,
    cursor?: string,
): Promise<{
    results: SublimeCard[];
    nextCursor?: string;
}> {
    const data = await fetchApi("GET", restrictToLibrary ? `v3/feed/library/` : `v3/feed/search/`, {
        searchParams: cursor
            ? Object.fromEntries(new URLSearchParams(cursor))
            : {
                  search: query, // v3 renamed the smart-search param knn -> search
                  page_size: 15, // Raycast pagination requires at least 10 items per page to work
                  entity_type: entityType,
                  // v3 ordering whitelist has no "most_recent"; map it to newest
                  order_by: orderBy === "most_recent" ? "-first_connection_at" : orderBy,
              },
    });

    return {
        results: data.results.map(flattenV3Card),
        nextCursor: nextCursorOf(data),
    };
}

export async function searchCardsInCollection(
    collectionUuid: string,
    query: string,
    cursor?: string,
): Promise<{
    results: SublimeCard[];
    nextCursor?: string;
}> {
    const data = await fetchApi("GET", `v2/feed/connections/`, {
        searchParams: cursor
            ? Object.fromEntries(new URLSearchParams(cursor))
            : {
                  entity: collectionUuid,
                  knn: query, // Always use smart search
                  page_size: 15,
              },
    });

    return {
        results: data.results,
        nextCursor: nextCursorOf(data),
    };
}

export async function fetchRelatedCards(
    entityId?: string,
    queryText?: string,
    cursor?: string,
): Promise<{
    results: SublimeCard[];
    nextCursor?: string;
}> {
    const data = await fetchApi(entityId ? "GET" : "POST", `v3/feed/related/`, {
        searchParams: cursor
            ? Object.fromEntries(new URLSearchParams(cursor))
            : {
                  uuid: entityId,
                  page_size: 15,
              },
        json: queryText
            ? {
                  text: queryText,
              }
            : undefined,
    });
    if (!data) {
        return {
            results: [],
        };
    }

    return {
        results: data.results.map(flattenV3Card),
        nextCursor: nextCursorOf(data),
    };
}

// v3 newfeed uses DRF cursor pagination, v2 feed uses page pagination; both
// return a `next` URL that already encodes the params for the following page.
// Forward that query string verbatim instead of computing page numbers.
function nextCursorOf(data: any): string | undefined {
    return data?.next ? new URL(data.next).search.slice(1) : undefined;
}

// Reshape a v3 newfeed entity (feed/related, feed/search, feed/library) back
// into the v2 SublimeCard shape the list view expects: metadata.* is lifted to
// the root, the singular `url` becomes a `urls` array, and the always-present
// empty `source` object is dropped.
function flattenV3Card(entity: any): SublimeCard {
    const metadata = entity.metadata ?? {};
    return {
        ...metadata,
        ...entity,
        // v3 NameField sometimes joins OG title + H1 with "\n"; collapse dupes.
        name: typeof metadata.name === "string" ? collapseDuplicateLines(metadata.name) : metadata.name,
        urls: entity.url ? [entity.url] : [],
        source: entity.source?.name || entity.source?.domain ? entity.source : undefined,
    };
}

function collapseDuplicateLines(s: string): string {
    const out: string[] = [];
    for (const line of s.split("\n")) {
        if (out.length && out[out.length - 1].trim() === line.trim()) continue;
        out.push(line);
    }
    return out.join("\n");
}

// fetch page info and existing user notes if present
export async function previewLink(url: string): Promise<PageInfo> {
    const response: PageInfo = await fetchApi("GET", "v2/cx/preview/", {
        searchParams: {
            url: cleanWebsiteUrl(url),
        },
    });

    if (url.endsWith(".pdf")) {
        // use filename as title if not parsed by backend
        const fileName = url.split("/").pop();
        response.name = response.name || fileName || "";
    }

    return { ...response, url };
}

// save page info and optional user curator data
export async function saveLink(
    pageInfo: PageInfo,
    noteHtml: string = "",
    connectedCollections: Collection[] = [],
    isFavorite: boolean = false,
    isPrivate: boolean = false,
): Promise<PageInfo> {
    const noteId = pageInfo.notes?.[0]?.uuid || undefined;
    const note = noteHtml && {
        entity_type: "contribution.note",
        uuid: noteId,
        html: noteHtml,
    };

    try {
        // connectedCollections = await createCollectionsIfRequired(connectedCollections);
        const curatorFields = {
            mark_as_favorite: isFavorite,
            mark_as_private: isPrivate,
            contributions: note ? [note] : [],
            connect: connectedCollections.map((c) => c.uuid),
        };

        let response: any;
        if (pageInfo.uuid) {
            // update existing entity
            response = await fetchApi("POST", `v2/entities/${pageInfo.uuid}/recurate/`, {
                json: {
                    entity_type: "curation.article",
                    ...curatorFields,
                },
            });

            // delete note separately
            if (!note && noteId) {
                await fetchApi("DELETE", `v2/entities/${noteId}/`);
            }
        } else {
            // create new entity
            response = await fetchApi("POST", "v2/entities/add/", {
                json: {
                    ...pageInfo,
                    entity_type: pageInfo.entity_type || "curation.article",
                    url: cleanWebsiteUrl(pageInfo.url),
                    is_curation: true,
                    ...curatorFields,
                },
            });
        }

        // API does not return all updated fields, so patch together optimistically
        return {
            // base fields
            ...pageInfo,
            // uuid
            ...response,
            // assumed update
            connections: connectedCollections,
            notes: [note],
            is_curator: true,
            is_favorite: isFavorite,
        };
    } catch (err: any) {
        if (err.response?.status === 403) {
            throw new FreemiumLimitReachedError();
        } else {
            console.error(err);
            throw err;
        }
    }
}

export async function saveTextEntity(
    html: string,
    noteHtml: string | undefined,
    connectedCollections: Collection[],
    isFavorite: boolean,
    isPrivate: boolean,
): Promise<PageEntity> {
    try {
        // highlights are always new in app
        const entity = await fetchApi("POST", `v2/entities/add/`, {
            json: {
                entity_type: "curation.text",
                html,
                mark_as_favorite: isFavorite,
                mark_as_private: isPrivate,
                connect: connectedCollections.map((c) => c.uuid),
                contributions: noteHtml ? [{ entity_type: "contribution.note", html: noteHtml }] : [],
            },
        });
        if (!entity) {
            throw new Error("Adding file highlight returned undefined");
        }

        return entity;
    } catch (err: any) {
        if (err.response?.status === 403) {
            throw new FreemiumLimitReachedError();
        } else {
            console.error(err);
            throw err;
        }
    }
}

export async function saveFileEntity(
    mimeType: string,
    tempFile: string,
    noteHtml: string | undefined,
    connectedCollections: Collection[],
    isFavorite: boolean,
    isPrivate: boolean,
): Promise<PageEntity> {
    try {
        const fileName = decodeURI(tempFile.split("/").pop()!);

        // Upload file via form-data (modified for Node.js)
        const body = new FormData();
        const buffer = await fs.readFile(tempFile);
        body.append("file", new File([buffer], fileName, { type: mimeType }));

        console.info(`Uploading file: ${fileName} ${mimeType} from ${tempFile}`);
        const response = await fetch(`${apiUrl}/v2/cx/upload-file/`, {
            method: "POST",
            body,
            headers: {
                ContentType: "multipart/form-data",
                Authorization: `Bearer ${await getApiToken()}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to upload file: ${await response.text()}`);
        }
        const json: any = await response.json();
        const remoteUrl = json.file;

        // Now save new file highlight
        const isImage = mimeType.startsWith("image/");
        const entity = await fetchApi("POST", `v2/entities/add/`, {
            json: {
                entity_type: isImage ? "curation.image" : "curation.file",
                url: remoteUrl,
                name: fileName,
                thumbnail: isImage ? remoteUrl : undefined,
                domain: "s3.amazonaws.com",
                mark_as_favorite: isFavorite,
                mark_as_private: isPrivate,
                contributions: noteHtml ? [{ entity_type: "contribution.note", html: noteHtml }] : [],
                connect: connectedCollections.map((c) => c.uuid),
            },
        });
        if (!entity) {
            throw new Error("Adding file returned undefined");
        }

        return entity;
    } catch (err: any) {
        if (err.response?.status === 403) {
            throw new FreemiumLimitReachedError();
        } else {
            console.error(err);
            throw err;
        }
    }
}

export async function searchCollections(query: string): Promise<Collection[]> {
    const response: any = await fetchApi("GET", `v3/cx/search/collections/`, {
        searchParams: {
            search: query,
            page_size: 20,
        },
    });
    return response.results;
}

// Browse the current user's collections. v3 feed/library scopes to collections
// only via `collections=true`; its default queryset excludes collection types,
// so an entity_type filter alone returns nothing.
export async function browseMyCollections(cursor?: string): Promise<{ results: SublimeCard[]; nextCursor?: string }> {
    const data = await fetchApi("GET", `v3/feed/library/`, {
        searchParams: cursor
            ? Object.fromEntries(new URLSearchParams(cursor))
            : {
                  collections: "true",
                  page_size: 15,
                  order_by: "-first_connection_at", // newest first
              },
    });

    return {
        results: data.results.map(flattenV3Card),
        nextCursor: nextCursorOf(data),
    };
}

// Name-based collection search (cx/search/collections), wrapped in the paginated
// envelope so the "Search My Collections" command can share the cards hook.
// feed/library does semantic search, which doesn't match collections by name.
export async function searchCollectionsByName(
    query: string,
    cursor?: string,
): Promise<{ results: SublimeCard[]; nextCursor?: string }> {
    const data = await fetchApi("GET", `v3/cx/search/collections/`, {
        searchParams: cursor
            ? Object.fromEntries(new URLSearchParams(cursor))
            : {
                  search: query,
                  page_size: 15,
              },
    });

    return {
        results: data.results,
        nextCursor: nextCursorOf(data),
    };
}

export async function getSuggestedCollections(entityId?: string): Promise<Collection[]> {
    if (entityId) {
        return await fetchApi("GET", `v2/cx/${entityId}/suggested-connections/`);
    } else {
        return await fetchApi("GET", `v2/cx/recent-connections/`);
    }
}

function cleanWebsiteUrl(url: string): string {
    // strip twitter /photo/1 suffix to correctly recognize entity type in backend
    if (url.startsWith("https://twitter.com/")) {
        url = url.replace(/\/photo\/[0-9]+$/, "");
    }
    return url;
}
