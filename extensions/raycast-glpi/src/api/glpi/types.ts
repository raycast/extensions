export type ErrorCode =
  | "GLPI_API_SERVER_UNREACHABLE"
  | "GLPI_API_SERVER_UNREACHABLE_COOLDOWN"
  | "GLPI_API_SERVER"
  | "GLPI_API_SERVER_AUTH_ERROR"
  | "GLPI_API_SERVER_AUTH_REQUIRED"
  | "GLPI_API_SERVER_AUTH_EXPIRED"
  | "GLPI_API_SERVER_POST"
  | "GLPI_API_SERVER_GET"
  | "GLPI_API_SERVER_RESPONSE_401"
  | "GLPI_API_SERVER_RESPONSE_ERROR"
  | "GLPI_API_SERVER_RESPONSE_EMPTY"
  | "GLPI_API_SERVER_RESPONSE_SYNTAX";

export type ReqBody = ReqBodyToken | ReqBodyPatchAssistanceTicket | ReqBodyPostAssistanceTicketTeamMember;

/* Response Body on Error */
export interface ResBodyError {
  error: string;
  error_description: string;
  hint: string;
  message: string;
}

/**
 * Request Body for Api Route `/api.php/token`
 */
export interface ReqBodyToken {
  grant_type: "password" | "refresh_token";
  client_id: string;
  client_secret: string;
  username?: string;
  password?: string;
  refresh_token?: string;
  scope: string;
}

/**
 * Response Body for Api Route `/api.php/token`
 */
export interface ResBodyToken {
  token_type: "Bearer";
  /**
   * number of seconds until the token expires.
   */
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

/**
 * Response Body for Api Route Get `/api.php/Session`
 */
export type ResBodyGetSession = Session;

/**
 * Response Body for Api Route GET `/api.php/Assistance/Ticket`
 */
export type ResBodyGetAssistanceTicket = Ticket[];

/**
 * Request Body for Api Route PATCH `/api.php/Assistance/Ticket/{id}`
 */
export type ReqBodyPatchAssistanceTicket = TicketPatch;

/**
 * Response Body for Api Route PATCH `/api.php/Assistance/Ticket/{id}`
 */
export type ResBodyPatchAssistanceTicket = Ticket;

/**
 * Request Body for Api Route POST `/api.php/Assistance/Ticket/{id}/TeamMember`
 */
export type ReqBodyPostAssistanceTicketTeamMember = TeamMemberPost;

/**
 * Request Body for Api Route POST `/api.php/Assistance/Ticket/{id}/TeamMember`
 */
export type ResBodyPostAssistanceTicketTeamMember = Href;

/**
 * Response Body for Api Route GET `/api.php/Assistance/Ticket/{id}/Timeline/Followup`
 */
export type ResBodyGetAssistanceTicketTimelineFollowup = Followup[];

/**
 * Response Body for Api Route POST `/api.php/Assistance/Ticket/{id}/Timeline/Followup`
 */
export type ReqBodyPostAssistanceTicketTimelineFollowup = FollowupPost;

/**
 * Response Body for Api Route POST `/api.php/Assistance/Ticket/{id}/Timeline/Followup`
 */
export type ResBodyPostAssistanceTicketTimelineFollowup = Href;

/**
 * Response Body for Api Route GET `/api.php/Dropdowns/FollowupTemplate`
 */
export type ResBodyGetDropdownFollowupTemplate = FollowupTemplate[];

/**
 * Glpi Server Access Token
 */
export interface Token {
  /* Formatted as `Bearer token` */
  token: string;
  /* Date in ms when the `token` will exprire */
  exprires_at: number;
  /* Refresh token*/
  refresh_token: string;
}

/* Glpi Server href */
export interface Href {
  id: number;
  href: string;
}

/**
 * Glpi Server Session
 */
export interface Session {
  user_id: number;
  user_mode: number;
  friendly_name: string;
  real_name: string;
  first_name: string;
}

/**
 * Glpi Server IdName
 */
export interface IdName {
  id: number;
  name: string;
}

/**
 * Glpi Server Entity
 */
export interface Entity extends IdName {
  completename: string;
}

/**
 * Glpi Server UserTeam
 */
export interface UserTeam extends IdName {
  type: string;
  role: string;
}

/**
 * Glpi Server Ticket
 */
export interface Ticket {
  id: number;
  name: string;
  content: string;
  user_recipient: IdName;
  user_editor: IdName;
  is_deleted: boolean;
  category: IdName;
  location: Location;
  urgency: number;
  impact: number;
  priority: number;
  actiontime: number;
  begin_waiting_date: string;
  waiting_duration: number;
  resolution_duration: number;
  close_duration: number;
  resolution_date: number;
  date_creation: string;
  date_mod: string;
  date: string;
  date_solve: string;
  date_close: string;
  type: number;
  external_id: string;
  request_type: IdName;
  take_into_account_date: string;
  take_into_account_duration: number;
  internal_resolution_date: string;
  internal_take_into_account_date: string;
  global_validation: number;
  status: IdName;
  entity: Entity;
  team: UserTeam[];
}

interface Id {
  id: number;
}

interface UserTeamPatch {
  name: string;
  type: string;
  role: string;
}

/**
 * Glpi Server Ticket
 */
export interface TicketPatch {
  name?: string;
  content?: string;
  user_recipient?: Id;
  user_editor?: Id;
  is_deleted?: boolean;
  category?: Id;
  location?: Id;
  urgency?: number;
  impact?: number;
  priority?: number;
  resolution_date?: number;
  date_creation?: string;
  date_mod?: string;
  date?: string;
  date_solve?: string;
  date_close?: string;
  type?: number;
  external_id?: string;
  request_type?: Id;
  take_into_account_date?: string;
  internal_resolution_date?: string;
  internal_take_into_account_date?: string;
  global_validation?: number;
  status?: Id;
  entity?: Entity;
  team?: UserTeamPatch[];
}

/**
 * Glpi Server TeamMember
 */
export interface TeamMember {
  id: number;
  name: string;
  type: string;
  role: string;
}

/**
 * Glpi Server TeamMemberPost
 */
export interface TeamMemberPost {
  type: "User" | "Group" | "Supplier";
  role: "requester" | "assigned" | "observer";
  id: number;
}

/**
 * Glpi Server Followup
 */
export interface Followup {
  type: "Followup";
  item: {
    id: number;
    itemtype: string;
    items_id: number;
    content: string;
    is_private: boolean;
    user: IdName;
    user_editor: IdName;
    reuqest_type: IdName;
    date: string;
    date_creation: string;
    date_mod: string;
    timeline_position: number;
    source_item_id: number;
    source_of_item_id: number;
  };
}

/**
 * Glpi Server Followup Post
 */
export interface FollowupPost {
  itemtype?: string;
  items_id?: number;
  content?: string;
  is_private?: boolean;
  user?: Id;
  user_editor?: Id;
  reuqest_type?: Id;
  date?: string;
  date_creation?: string;
  date_mod?: string;
  timeline_position?: number;
  source_item_id?: number;
  source_of_item_id?: number;
}

/**
 * Glpi Server FollowupTemplate
 */
export interface FollowupTemplate {
  id: number;
  name: string;
  content: string;
  comment: string;
  entity: Entity;
  is_recursive: boolean;
  is_private: boolean;
  request_type: IdName;
  date_creation: string;
  date_mod: string;
}
