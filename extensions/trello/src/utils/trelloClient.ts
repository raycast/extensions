import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Board } from "../Board";
import { List } from "../List";
import { Member } from "../Member";
import { preferences } from "./types";
import { TrelloCard, TrelloCardDetails } from "../trelloResponse.model";

const API_BASE = "https://api.trello.com/1";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const authParams = () => {
  const { token, apitoken } = getPreferenceValues<preferences>();
  return `key=${encodeURIComponent(apitoken)}&token=${encodeURIComponent(token)}`;
};

const withAuth = (path: string) => {
  const glue = path.includes("?") ? "&" : "?";
  return `${API_BASE}${path}${glue}${authParams()}`;
};

async function trelloFetch<T>(path: string, method: HttpMethod = "GET", body?: string): Promise<T> {
  try {
    const response = await fetch(withAuth(path), { method, body });
    if (!response.ok) {
      const message = `${response.status} ${response.statusText}`;
      showToast(Toast.Style.Failure, "Trello request failed", message);
      throw new Error(message);
    }
    return (await response.json()) as T;
  } catch (error) {
    showToast(Toast.Style.Failure, "Trello request failed", (error as Error).message);
    throw error;
  }
}

export const trelloClient = {
  async getBoards(includeClosed: boolean): Promise<Board[]> {
    const filter = includeClosed ? "all" : "open";
    return trelloFetch<Board[]>(`/members/me/boards?organization=true&filter=${filter}`);
  },

  async getLists(boardId: string): Promise<List[]> {
    return trelloFetch<List[]>(`/boards/${boardId}/lists`);
  },

  async getBoardMembers(boardId: string): Promise<Member[]> {
    return trelloFetch<Member[]>(`/boards/${boardId}/members`);
  },

  async getMyCards(): Promise<TrelloCard[]> {
    return trelloFetch<TrelloCard[]>(
      `/members/me/cards?fields=name,desc,url,due,idBoard,idList,labels,dueComplete,shortUrl&members=true&member_fields=fullName,username,avatarUrl`,
    );
  },

  async searchCards(query: string): Promise<TrelloCard[]> {
    const sanitized = encodeURIComponent(query.trim());
    if (!sanitized) return [];
    const path = `/search?query=${sanitized}&modelTypes=cards&cards_limit=50&card_fields=name,desc,url,due,idBoard,idList,labels,dueComplete,shortUrl&card_list=true&card_members=true&card_member_fields=fullName,username,avatarUrl`;
    const result = await trelloFetch<{ cards: TrelloCard[] }>(path);
    return result.cards ?? [];
  },

  async getCardsForList(listId: string): Promise<TrelloCard[]> {
    return trelloFetch<TrelloCard[]>(
      `/lists/${listId}/cards?fields=name,desc,url,due,idBoard,idList,labels,dueComplete,shortUrl&members=true&member_fields=fullName,username,avatarUrl`,
    );
  },

  async getCardDetails(cardId: string): Promise<TrelloCardDetails> {
    return trelloFetch<TrelloCardDetails>(
      `/cards/${cardId}?attachments=true&attachment_fields=url,name,date,bytes&checklists=all&fields=name,desc,url,due,dueComplete,idBoard,idList,labels,shortUrl`,
    );
  },

  async createCard(payload: {
    name: string;
    desc?: string;
    due?: Date | null;
    idList: string;
    idMembers?: string[];
  }): Promise<TrelloCard> {
    const params = new URLSearchParams();
    params.append("name", payload.name);
    if (payload.desc) params.append("desc", payload.desc);
    if (payload.due) params.append("due", payload.due.toISOString());
    params.append("idList", payload.idList);
    if (payload.idMembers?.length) params.append("idMembers", payload.idMembers.join(","));
    return trelloFetch<TrelloCard>(`/cards?${params.toString()}`, "POST");
  },

  async moveCard(cardId: string, targetListId: string): Promise<TrelloCard> {
    const params = new URLSearchParams();
    params.append("idList", targetListId);
    return trelloFetch<TrelloCard>(`/cards/${cardId}?${params.toString()}`, "PUT");
  },

  async deleteCard(cardId: string): Promise<void> {
    await trelloFetch(`/cards/${cardId}`, "DELETE");
  },
};
