import { Status, Visibility } from "./defines";

export interface StandardError {
  detail: string;
}

export interface ValidationError {
  errors: {
    body?: string;
  };
}

export interface WrappedResponse {
  success: boolean;
  card_id: string;
  status_code: number;
  payload: ICard | string;
}
export interface WrappedCard extends WrappedResponse {
  success: true;
  payload: ICard;
}
export interface WrappedError extends WrappedResponse {
  success: false;
  payload: string;
}

export type WrappedCardResponses = Array<WrappedCard | WrappedError>;
export type ICardCollection = Record<string, ICard>;

export interface ICard {
  membership: ICardMembership;
  data: ICardData;
  links: Record<string, IParentLink>;
}

export type ICardMembership = {
  id: string;
  liked: boolean | null;
  personal_tags: Array<string>;
  personal_color: string | null;
  perms: number;
  via_type: number;
  via_id: string | null;
  created_when: string;
  modified_when: string;
  enrolled_when: string | null;
  opened_when: string | null;
  auto_publish_children: boolean | null;
  view: {
    display_type: number;
    sort_type: number;
    sort_ascending: boolean;
  } | null;
  visibility: Visibility;
  status: Status;
  total_child_count: number;
  share_link_count: number;
};

export interface ICardData {
  id: string;
  owner_id: string;
  name: string;
  markup: string;
  html: string;
  ydoc: string;
  icon: string | null;
  frozen: boolean | null;
  backlinks: Record<string, IBacklink>;
  tags: Array<string>;
  created_when: string;
  modified_when: string;
  modified_by_id: string | null;
  synced_when: string | null;
  targeted_when: string | null;
  status: Status;
  member_count: number;
  color: string | null;
  comment_count: number;
  published_child_count: number;
  likes: number;
  import_id?: string;
}
export interface IBacklink {
  back_id: string;
  fore_id: string;
  created_when: string;
}

export interface IParentLink {
  base: {
    id: string;
    owner_id: string;
    parent_card_id: string;
    child_card_id: string;
    published: boolean;
    granted_perms: number;
    archived: boolean;
  };
  status: Status;
  temp?: boolean;
  cutting?: boolean;
}
