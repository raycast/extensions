import * as domains from "./domains";
import fetch from "./fetch";
import APIError from "./APIError";

type Alias = {
  id: string;
  user_id: string;
  aliasable_id: null;
  aliasable_type: null;
  local_part: string;
  extension: null;
  domain: string;
  email: string;
  active: boolean;
  description: string | null;
  from_name: null;
  emails_forwarded: number;
  emails_blocked: number;
  emails_replied: number;
  emails_sent: number;
  recipients: any[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type Create = {
  data: Alias;
};

type Edit = {
  data: Alias;
};

type Get = {
  data: Alias;
};

type GetAll = {
  data: Alias[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
};

// @see https://app.addy.io/docs/#aliases-POSTapi-v1-aliases
async function create(): Promise<Alias> {
  const options = await domains.options();
  const defaultDomain = options.defaultAliasDomain;

  const response = await fetch(`/aliases`, {
    method: "POST",
    body: JSON.stringify({
      domain: defaultDomain,
    }),
  });

  if (response.status !== 201) {
    throw new APIError(response.status);
  }

  const data = (await response.json()) as Create;

  return data.data;
}

// @see https://app.addy.io/docs/#aliases-PATCHapi-v1-aliases--id-
async function edit(id: string, value: Pick<Alias, "description">): Promise<Alias> {
  const response = await fetch(`/aliases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(value),
  });

  if (response.status !== 200) {
    throw new APIError(response.status);
  }

  const data = (await response.json()) as Edit;

  return data.data;
}

// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-aliases--id--forget
async function forget(id: string): Promise<void> {
  const res = await fetch(`/aliases/${id}/forget`, { method: "DELETE" });

  if (res.status !== 204) {
    throw new APIError(res.status);
  }
}

async function getAll(number = 1): Promise<Alias[]> {
  const response = await fetch(`/aliases?page[number]=${number}&page[size]=${100}`);

  if (response.status !== 200) {
    throw new APIError(response.status);
  }

  const data = (await response.json()) as GetAll;

  return data.meta.current_page < data.meta.last_page ? [...data.data, ...(await getAll(number + 1))] : data.data;
}

async function getOne(id: string): Promise<Alias> {
  const response = await fetch(`/aliases/${id}`);

  if (response.status !== 200) {
    throw new APIError(response.status);
  }

  const data = (await response.json()) as Get;

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
  const res = await fetch(`/aliases/${id}`, { method: "DELETE" });

  if (res.status !== 204) {
    throw new APIError(res.status);
  }
}

// @see https://app.addy.io/docs/#aliases-POSTapi-v1-active-aliases
// @see https://app.addy.io/docs/#aliases-DELETEapi-v1-active-aliases--id-
async function toggle(id: string, force: boolean | undefined = undefined): Promise<void> {
  if (force === undefined) {
    const response = await get(id);

    force = !response.active;
  }

  if (force) {
    const response = await fetch(`/active-aliases`, {
      method: "POST",
      body: JSON.stringify({
        id,
      }),
    });

    if (response.status !== 200) {
      throw new APIError(response.status);
    }
  } else {
    const response = await fetch(`/active-aliases/${id}`, { method: "DELETE" });

    if (response.status !== 204) {
      throw new APIError(response.status);
    }
  }
}

export { create, edit, get, forget, remove, toggle };
export type { Alias };
