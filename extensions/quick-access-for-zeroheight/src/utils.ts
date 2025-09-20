export const BASE_URL = "https://zeroheight.com/open_api/v2/";

export interface StyleguideListResponse {
  status: string;
  data: {
    styleguides: { id: number; name: string; created_at: string; share_id: string }[];
  };
}

export interface StyleguideListItemData {
  id: number;
  name: string;
  share_id: string;
  humanCreatedAt?: string;
  createdAt: Date | null;
}

export interface StyleguidePageListResponse {
  status: string;
  data: {
    pages: { id: number; name: string; created_at: string; updated_at: string }[];
  };
}

export interface StyleguidePageData {
  id: number;
  name: string;
  url: string;
  introduction: string;
  content?: string;
  tabs?: { name: string; order: number; content: string }[];
  locked: boolean;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface StyleguidePageResponse {
  status: string;
  data: {
    page: StyleguidePageData;
  };
}

export interface PageStatusResponse {
  status: string;
  data: {
    id: string;
    name: string;
  };
}

export function formatPageName(name?: string) {
  if (name === "___cover") {
    return "Cover Page";
  }

  return name ?? "Untitled page";
}

export function getAuthHeaders(clientId: string, accessToken: string) {
  return {
    "X-API-CLIENT": clientId,
    "X-API-KEY": accessToken,
    "Content-Type": "application/json",
  };
}

export function isContentEmpty(page: Pick<StyleguidePageData, "tabs" | "content">) {
  if (!page.content && !page.tabs) return true;
  if (page.content && page.content.length === 0) return true;
  if (page.tabs && page.tabs.length === 0) return true;

  return false;
}

export function getContentOrDefault(page: Pick<StyleguidePageData, "tabs" | "content">) {
  if (isContentEmpty(page)) {
    return `# No content found\n_This could be because there are blocks which the API can't currently display or there is no content on the page._`;
  }

  if (page.tabs) {
    return page.tabs
      .toSorted((tabA, tabB) => tabB.order - tabA.order)
      .reduce((acc, curr) => acc + `# ${curr.name}\n\n---\n\n${curr.content}\n\n`, "");
  }

  return page.content;
}

export function statusIdToColor(id?: string) {
  if (!id) return "#F2F1F2";

  return (
    {
      new: "#E1FFF0",
      ready: "#E1FFF0",
      in_progress: "#E2F1FF",
      to_do: "#FFFCC3",
      deprecated: "#FFE9E8",
      beta: "#F2F1F2",
      not_applicable: "#F2F1F2",
    }?.[id] ?? "#F2F1F2"
  );
}

/**
 * Parse date or return null when invalid
 * @param rawDate date string
 */
export function parseDate(rawDate: string) {
  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.valueOf())) return null;
  return parsedDate;
}
