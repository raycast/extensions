import { confluenceRequest, handleApiResponse, transformURL } from "@/utils";
import { CONFLUENCE_API } from "@/constants";
import type { ConfluenceContentSearchResponse, ConfluenceSearchResponse, ConfluenceCurrentUser } from "@/types";

type SearchContentParams = {
  cql: string;
  limit: number;
  offset: number;
};

export async function getConfluenceContents({
  cql,
  limit,
  offset,
}: SearchContentParams): Promise<ConfluenceContentSearchResponse> {
  const params = {
    cql,
    start: offset,
    limit,
    expand: "space,history.createdBy,history.lastUpdated,metadata.currentuser.favourited",
  };

  const data = await confluenceRequest<ConfluenceContentSearchResponse>({
    method: "GET",
    url: CONFLUENCE_API.SEARCH_CONTENT,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "confluence-contents",
    defaultValue: {
      results: [],
      start: 0,
      limit,
      size: 0,
      totalSize: 0,
      totalCount: 0,
      _links: {
        base: "",
        context: "",
      },
      cqlQuery: cql,
      searchDuration: 0,
    },
  });
}

type AddToFavoriteParams = {
  contentId: string;
};

export async function addConfluenceContentToFavorite({ contentId }: AddToFavoriteParams): Promise<void> {
  const url = transformURL(CONFLUENCE_API.CONTENT_FAVOURITE, { contentId });
  await confluenceRequest<void>({ method: "PUT", url });
}

type RemoveFromFavoriteParams = {
  contentId: string;
};

export async function removeConfluenceContentFromFavorite({ contentId }: RemoveFromFavoriteParams): Promise<void> {
  const url = transformURL(CONFLUENCE_API.CONTENT_FAVOURITE, { contentId });
  await confluenceRequest<void>({ method: "DELETE", url });
}

type SearchUserParams = {
  cql: string;
  limit: number;
  offset: number;
};

export async function getConfluenceUsers({ cql, limit, offset }: SearchUserParams): Promise<ConfluenceSearchResponse> {
  const params = {
    cql,
    start: offset,
    limit,
    expand: "user,user.status",
  };

  const data = await confluenceRequest<ConfluenceSearchResponse>({
    method: "GET",
    url: CONFLUENCE_API.SEARCH,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "confluence-users",
    defaultValue: {
      results: [],
      start: 0,
      limit,
      size: 0,
      totalSize: 0,
      totalCount: 0,
      cqlQuery: cql,
      searchDuration: 0,
      _links: {
        base: "",
        context: "",
      },
    },
  });
}

type SearchSpaceParams = {
  cql: string;
  limit: number;
  offset: number;
};

export async function getConfluenceSpaces({
  cql,
  limit,
  offset,
}: SearchSpaceParams): Promise<ConfluenceSearchResponse> {
  const params = {
    cql,
    start: offset,
    limit,
    expand: "space,space.description.plain,space.icon,space.metadata.labels",
  };

  const data = await confluenceRequest<ConfluenceSearchResponse>({
    method: "GET",
    url: CONFLUENCE_API.SEARCH,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "confluence-spaces",
    defaultValue: {
      results: [],
      start: 0,
      limit,
      size: 0,
      totalSize: 0,
      totalCount: 0,
      _links: {
        base: "",
        context: "",
      },
      cqlQuery: cql,
      searchDuration: 0,
    },
  });
}

export async function getConfluenceCurrentUser(): Promise<ConfluenceCurrentUser | null> {
  const data = await confluenceRequest<ConfluenceCurrentUser>({ method: "GET", url: CONFLUENCE_API.CURRENT_USER });

  return handleApiResponse({
    data,
    fileName: "confluence-current-user",
    defaultValue: null,
  });
}
