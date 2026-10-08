import got from "got";
import { CookieJar } from "tough-cookie";
import { APIData, CollectionData, Item, UserData, LoginResponse } from "./types";
import RaycastCacheStore from "./cacheStore";

const store = new RaycastCacheStore();
export const cookieJar = new CookieJar(store);

const client = got.extend({
  prefixUrl: "https://www.curator.bio/api/v2",
  cookieJar,
  followRedirect: false,
});

export const login = async (email: string, password: string) => {
  return client
    .post("users/signIn", {
      json: {
        email,
        password,
      },
    })
    .json() as Promise<LoginResponse>;
};

export const getMe = async () => {
  return client.get("users/me/").json() as Promise<APIData<UserData>>;
};

export const getUser = async (userId: string) => {
  return client.get(`users/${userId}`).json() as Promise<APIData<UserData>>;
};

// https://www.curator.bio/api/v2/items?page=1&perPage=30

export const getItems = async (page = 1, perPage = 30) => {
  return client
    .get("items", {
      searchParams: {
        page,
        perPage,
      },
    })
    .json() as Promise<APIData<Item[]>>;
};

// https://www.curator.bio/api/v2/users/me/subscriptions/items?page=1&perPage=30

export const getSubscriptionItems = async (page = 1, perPage = 30) => {
  return client
    .get(`users/me/subscriptions/items?page=${page}&perPage=${perPage}`, {
      searchParams: {
        page,
        perPage,
      },
    })
    .json() as Promise<APIData<Item[]>>;
};

// `/api/v2/users/${userCustomId}/colls`,
export const getCollections = async (userId: string) => {
  return client.get(`users/${userId}/colls`).json() as Promise<APIData<CollectionData>>;
};

export const getCollectionItems = async (userId: string, collectionId: string) => {
  return client
    .get(`users/${userId}/items`, {
      searchParams: {
        collCustomId: collectionId,
      },
    })
    .json() as Promise<APIData<Item[]>>;
};

export const getMyItemDetail = async (id: string) => {
  return client.get(`users/me/items/${id}`).json();
};

// Upload image
// https://www.curator.bio/api/v2/upload?type=UserItemContent

// Form, file: binary, response: { data: "url-of-image" }

// https://www.curator.bio/api/v2/users/me/items
// https://www.curator.bio/api/v2/users/charles
// https://www.curator.bio/api/v2/users/charles/items?collCustomId=62d83095
// https://www.curator.bio/api/v2/users/me/items/637f7742594a8ca164302abd
