import got from "got";
import { CookieJar } from "tough-cookie";
// import RaycastCacheStore from "./cacheStore";

// const store = new RaycastCacheStore();
const cookieJar = new CookieJar();

const client = got.extend({
  prefixUrl: "https://www.curator.bio/api/v2",
  resolveBodyOnly: true,
  cookieJar,
});

export const login = async (email: string, password: string) => {
  return client.post("users/signIn", {
    json: {
      email,
      password,
    },
    resolveBodyOnly: false,
  });
};

export const getMe = async () => {
  return client.get("users/me/");
};

// https://www.curator.bio/api/v2/users/me/subscriptions/items?page=1&perPage=30

export const getSubscriptions = async (page = 1, perPage = 30) => {
  return client
    .get(`users/me/subscriptions/items?page=${page}&perPage=${perPage}`, {
      searchParams: {
        page,
        perPage,
      },
    })
    .text()
    .then((r) => JSON.parse(r));
};
