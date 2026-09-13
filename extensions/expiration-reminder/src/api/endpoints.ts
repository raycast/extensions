import { apiRequest } from "./client";
import {
  Attachment,
  AttachmentListModel,
  CategoryListModel,
  Contact,
  ContactListModel,
  ExpirationItem,
  ExpirationItemListModel,
  ExpirationStatus,
} from "./types";

interface ListParams {
  page?: number;
  paging?: number;
  sort?: string;
  sortDirection?: "asc" | "desc";
  signal?: AbortSignal;
}

/**
 * GET /v1/expirationitems with an optional status bucket, search term, and/or
 * server-side "expiring within N days" window.
 *
 * `expiresWithinDays` (ENG-2641) returns only items whose expiration date falls in
 * the inclusive window [today, today+N], excluding items with no date. NOTE: the
 * backend computes the window against server UTC (`> 0` enables it; `-1`/omitted
 * disables). Compose it with `status=current` + `sort=expiration_date&asc`.
 */
export function listExpirations(
  params: ListParams & { status?: ExpirationStatus; term?: string; expiresWithinDays?: number },
): Promise<ExpirationItemListModel> {
  const { status, term, expiresWithinDays, page, paging, sort, sortDirection, signal } = params;
  return apiRequest<ExpirationItemListModel>("/v1/expirationitems", {
    query: { status, term, expiresWithinDays, page, paging, sort, sortDirection },
    signal,
  });
}

/** GET /v1/expirationitems/contact/{id} — all expirations for one contact. */
export function listExpirationsForContact(
  contactId: string,
  params: { page?: number; signal?: AbortSignal } = {},
): Promise<ExpirationItemListModel> {
  return apiRequest<ExpirationItemListModel>(`/v1/expirationitems/contact/${contactId}`, {
    query: { page: params.page },
    signal: params.signal,
  });
}

/** GET /v1/contacts — search contacts by name, or by email when the query looks like one. */
export function searchContacts(params: ListParams & { term?: string; email?: string }): Promise<ContactListModel> {
  const { term, email, page, paging, sort, sortDirection, signal } = params;
  return apiRequest<ContactListModel>("/v1/contacts", {
    query: { term, email, page, paging, sort, sortDirection },
    signal,
  });
}

/** GET /v1/categories — for the create-expiration category dropdown. */
export function listCategories(params: { paging?: number; signal?: AbortSignal } = {}): Promise<CategoryListModel> {
  return apiRequest<CategoryListModel>("/v1/categories", {
    query: { paging: params.paging ?? 500 },
    signal: params.signal,
  });
}

export interface CreateExpirationInput {
  name: string;
  categoryId?: string;
  expirationDate: string; // yyyy-MM-dd
  details?: string;
  contactId?: string;
}

/** POST /v1/expirationitems */
export function createExpiration(input: CreateExpirationInput): Promise<ExpirationItem> {
  const body: Record<string, unknown> = {
    name: input.name,
    expiration_date: input.expirationDate,
  };
  if (input.categoryId) body.category = { id: input.categoryId };
  if (input.details) body.details = input.details;
  if (input.contactId) body.contact_id = input.contactId;
  return apiRequest<ExpirationItem>("/v1/expirationitems", { method: "POST", body });
}

export interface CreateContactInput {
  name: string;
  email: string;
  mobile?: string;
  phone?: string;
}

/** POST /v1/contacts */
export function createContact(input: CreateContactInput): Promise<Contact> {
  return apiRequest<Contact>("/v1/contacts", {
    method: "POST",
    body: {
      name: input.name,
      email: input.email,
      mobile: input.mobile || undefined,
      phone: input.phone || undefined,
    },
  });
}

/**
 * GET /v1/attachments/search — global attachment search across every entity type
 * that supports attachments (expiration items, contacts, locations, vehicles,
 * equipment, companies). Each result carries `entity_type` + `entity_id` for
 * deep-linking, and is permission-scoped to the caller server-side (ENG-2642).
 *
 * `includeFileContent=false` is ALWAYS sent to avoid pulling base64 blobs.
 * (The server pages at 25; there is no `paging` override.)
 */
export function searchFiles(params: {
  term?: string;
  page?: number;
  signal?: AbortSignal;
}): Promise<AttachmentListModel> {
  return apiRequest<AttachmentListModel>("/v1/attachments/search", {
    query: { term: params.term, page: params.page, includeFileContent: false },
    signal: params.signal,
  });
}

export type { Attachment };
