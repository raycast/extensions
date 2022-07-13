export interface SupernotesErrorPayload {
  detail: string;
}

export type IStatus = [-2, -1, 0, 1, 2];
export type IVisibility = [-1, 0, 1];

export type ICardCollection = Record<string, ICard>;

export interface ICard {
  membership: ICardMembership;
  data: ICardData;
  links: Record<string, IParentLink>;
}

export interface ICardMembership {
  id: string;
  perms: number;
  personal_tags: Array<string>;
  color: null | string;
  created_when: string;
  interacted_when: string;
  modified_when: null | string;
  has_commented: boolean;
  enrolled: null | boolean;
  is_context: null | boolean;
  status: IStatus;
  visibility: IVisibility;
  held_total_child_count: number;
  held_published_child_count: number;
  liked: null | boolean;
  via_type: number;
  via_id: null | string;
}

export interface ICardData {
  id: string;
  owner_id: string;
  name: string;
  markup: string;
  html: string;
  icon: string | null;
  frozen: boolean | null;
  backlinks: Record<string, IBacklink>;
  tags: Array<string>;
  created_when: string;
  modified_when: string;
  modified_by_id: string | null;
  synced_when: string | null;
  targeted_when: string | null;
  status: IStatus;
  member_count: number;
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
  status: IStatus;
  temp?: boolean;
  cutting?: boolean;
}
