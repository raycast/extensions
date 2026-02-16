import fetchCookie from "fetch-cookie";
import { CookieJar } from "tough-cookie";

const cookieJar = new CookieJar();
export const fetchWithCookies = fetchCookie(fetch, cookieJar);
