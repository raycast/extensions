import { cookieStore, tokenStore } from "./api";

export default async () => {
  await tokenStore.clean();
  await cookieStore.clean();
};
