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
    return await fetchApi("GET", `settings/profile/`);
}

export async function searchSublimeCards(
    query: string,
    restrictToLibrary: boolean,
    entityType?: string,
    orderBy?: string,
    page = 1,
): Promise<{
    results: SublimeCard[];
    nextPage?: number;
}> {
    const data = await fetchApi("GET", restrictToLibrary ? `feed/library/` : `feed/search/`, {
        searchParams: {
            knn: query, // Always use smart search
            page,
            page_size: 15, // Raycast pagination requires at least 10 items per page to work
            entity_type: entityType,
            order_by: orderBy,
        },
    });

    return {
        results: data.results,
        nextPage: data.next ? page + 1 : undefined,
    };
}

export async function searchCardsInCollection(
    collectionUuid: string,
    query: string,
    page = 1,
): Promise<{
    results: SublimeCard[];
    nextPage?: number;
}> {
    const data = await fetchApi("GET", `feed/connections/`, {
        searchParams: {
            entity: collectionUuid,
            knn: query, // Always use smart search
            page, // Raycast pagination requires at least 10 items per page to work
            page_size: 15,
        },
    });

    return {
        results: data.results,
        nextPage: data.next ? page + 1 : undefined,
    };
}

export async function fetchRelatedCards(
    entityId?: string,
    queryText?: string,
    page = 1,
): Promise<{
    results: SublimeCard[];
    nextPage?: number;
}> {
    const data = await fetchApi(entityId ? "GET" : "POST", `feed/related/`, {
        searchParams: {
            entity: entityId,
            page_size: 15,
            page,
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
        results: data.results,
        nextPage: data.next ? page + 1 : undefined,
    };
}

// fetch page info and existing user notes if present
export async function previewLink(url: string): Promise<PageInfo> {
    const response: PageInfo = await fetchApi("GET", "cx/preview/", {
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
            response = await fetchApi("POST", `entities/${pageInfo.uuid}/recurate/`, {
                json: {
                    entity_type: "curation.article",
                    ...curatorFields,
                },
            });

            // delete note separately
            if (!note && noteId) {
                await fetchApi("DELETE", `entities/${noteId}/`);
            }
        } else {
            // create new entity
            response = await fetchApi("POST", "entities/add/", {
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
        const entity = await fetchApi("POST", `entities/add/`, {
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
        const response = await fetch(`${apiUrl}/cx/upload-file/`, {
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
        const entity = await fetchApi("POST", `entities/add/`, {
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
    const response: any = await fetchApi("GET", `cx/search/collections/`, {
        searchParams: {
            search: query,
            page_size: 20,
        },
    });
    return response.results;
}

export async function getSuggestedCollections(entityId?: string): Promise<Collection[]> {
    if (entityId) {
        return await fetchApi("GET", `cx/${entityId}/suggested-connections/`);
    } else {
        return await fetchApi("GET", `cx/recent-connections/`);
    }
}

function cleanWebsiteUrl(url: string): string {
    // strip twitter /photo/1 suffix to correctly recognize entity type in backend
    if (url.startsWith("https://twitter.com/")) {
        url = url.replace(/\/photo\/[0-9]+$/, "");
    }
    return url;
}
