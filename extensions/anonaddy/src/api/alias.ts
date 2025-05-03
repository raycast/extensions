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

    options = {
      domain: defaults.defaultAliasDomain,
      format: defaults.defaultAliasFormat,
    };
  }

  const response = await fetch(`aliases`, {
    body: options,
    method: "POST",
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create alias: ${response.status}`);
  }

  const data = (await response.json()) as Resource<Alias>;

  return data.data;
}

// @see https://app.addy.io/docs/#aliases-PATCHapi-v1-aliases--id-
async function edit(id: string, value: Pick<Alias, "description">): Promise<Alias> {
  const response = await fetch(`aliases/${id}`, {
    body: value,
    method: "PATCH",
  });

  if (response.status !== 200) {
    throw new Error(`Failed to edit alias: ${response.status}`);
  }

  const data = (await response.json()) as Resource<Alias>;

  return data.data;
}

// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-aliases--id--forget
async function forget(id: string): Promise<void> {
  const response = await fetch(`aliases/${id}/forget`, { method: "DELETE" });

  if (response.status !== 204) {
    throw new Error(`Failed to forget alias: ${response.status}`);
  }
}

async function getAll(page = 1): Promise<Alias[]> {
  const response = await fetch(`aliases?page[number]=${page}&page[size]=${100}&with=recipients`);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch aliases: ${response.status}`);
  }

  const data = (await response.json()) as Paginated<Alias>;

  return data.meta.current_page < data.meta.last_page ? [...data.data, ...(await getAll(page + 1))] : data.data;
}

async function getOne(id: string): Promise<Alias> {
  const response = await fetch(`aliases/${id}`);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch alias: ${response.status}`);
  }

  const data = (await response.json()) as Resource<Alias>;

  return data.data;
}

// @see https://app.addy.io/docs/#aliases-GETapi-v1-aliases
async function get(id: string): Promise<Alias>;
async function get(): Promise<Alias[]>;
async function get(id?: string): Promise<Alias | Alias[]> {
  return id ? getOne(id) : getAll();
}

// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-aliases--id-
async function remove(id: string): Promise<void> {
  const res = await fetch(`aliases/${id}`, { method: "DELETE" });

  if (res.status !== 204) {
    throw new Error(``);
  }
}

// @see https://app.addy.io/docs/#aliases-POSTapi-v1-active-aliases
// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-active-aliases--id-
async function toggle(id: string, force?: boolean): Promise<void> {
  if (force === undefined) {
    const response = await get(id);

    force = !response.active;
  }

  if (force) {
    const response = await fetch(`active-aliases`, { body: { id }, method: "POST" });

    if (response.status !== 200) {
      throw new Error(`Failed to toggle alias: ${response.status}`);
    }
  } else {
    const response = await fetch(`active-aliases/${id}`, { method: "DELETE" });

    if (response.status !== 204) {
      throw new Error(`Failed to toggle alias: ${response.status}`);
    }
  }
}

export type { CreateOptions };
export { create, edit, get, forget, remove, toggle };
