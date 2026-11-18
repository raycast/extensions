import * as domains from "./domains";
import fetch from "./fetch";

import type { Alias, Domain, Format, Paginated, Resource } from "./types";

type CreateOptions = {
  description?: string;
  domain: Domain;
  format: Format;
  local_part?: string;
  recipients_ids?: string[];
};

// @see https://app.addy.io/docs/#aliases-POSTapi-v1-aliases
async function create(options?: CreateOptions): Promise<Alias> {
  if (!options) {
    const defaults = await domains.options();

    options = { domain: defaults.defaultAliasDomain, format: defaults.defaultAliasFormat };
  }

  const response = await fetch<Resource<Alias>>(`aliases`, { body: options, method: "POST" });

  return response.data;
}

// @see https://app.addy.io/docs/#aliases-PATCHapi-v1-aliases--id-
async function edit(id: string, value: Pick<Alias, "description">): Promise<Alias> {
  const response = await fetch<Resource<Alias>>(`aliases/${id}`, { body: value, method: "PATCH" });

  return response.data;
}

// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-aliases--id--forget
async function forget(id: string): Promise<void> {
  return fetch(`aliases/${id}/forget`, { method: "DELETE" });
}

async function getAll(page = 1): Promise<Alias[]> {
  const response = await fetch<Paginated<Alias>>(`aliases?page[number]=${page}&page[size]=${100}&with=recipients`);

  return response.meta.current_page < response.meta.last_page
    ? [...response.data, ...(await getAll(page + 1))]
    : response.data;
}

async function getOne(id: string): Promise<Alias> {
  const response = await fetch<Resource<Alias>>(`aliases/${id}`);

  return response.data;
}

// @see https://app.addy.io/docs/#aliases-GETapi-v1-aliases
async function get(id: string): Promise<Alias>;
async function get(): Promise<Alias[]>;
async function get(id?: string): Promise<Alias | Alias[]> {
  return id ? getOne(id) : getAll();
}

// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-aliases--id-
async function remove(id: string): Promise<void> {
  return fetch(`aliases/${id}`, { method: "DELETE" });
}

// @see https://app.addy.io/docs/#aliases-POSTapi-v1-active-aliases
// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-active-aliases--id-
async function toggle(id: string, force?: boolean): Promise<void> {
  if (force === undefined) {
    const response = await get(id);

    force = !response.active;
  }

  return force
    ? fetch(`active-aliases`, { body: { id }, method: "POST" })
    : fetch(`active-aliases/${id}`, { method: "DELETE" });
}

export type { CreateOptions };
export { create, edit, get, forget, remove, toggle };
