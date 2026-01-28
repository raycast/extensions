// Touch cookie store implementation for Raycast extension Cache storage
// Modified from https://github.com/expo/tough-cookie-web-storage-store/blob/master/WebStorageCookieStore.js#L122
// https://github.com/salesforce/tough-cookie/blob/b1a8898ee3f8af52c6c1c355555d9f50ebe626ce/lib/memstore.js#L65
import ToughCookie from "tough-cookie";
import { Cache } from "@raycast/api";
import get from "lodash/get";
import set from "lodash/set";
import unset from "lodash/unset";
import values from "lodash/values";
const { Cookie, Store } = ToughCookie;
const STORE_KEY = "__cookieStore__";

export class CacheStore extends Store {
  constructor() {
    super();
    this.cache = new Cache({
      namespace: "cookies",
    });
    this.synchronous = true;
  }

  findCookie(domain, path, key, callback) {
    const store = this._readStore();
    const cookie = get(store, [domain, path, key], null);
    callback(null, Cookie.fromJSON(cookie));
  }

  findCookies(domain, path, allowSpecialUseDomain, callback) {
    if (typeof allowSpecialUseDomain === "function") {
      callback = allowSpecialUseDomain;
      allowSpecialUseDomain = true;
    }

    if (!domain) {
      callback(null, []);
      return;
    }
    let cookies = [];
    const store = this._readStore();
    const domains = ToughCookie.permuteDomain(domain) || [domain];
    for (const domain of domains) {
      if (!store[domain]) {
        continue;
      }
      let matchingPaths = Object.keys(store[domain]);
      if (path != null) {
        matchingPaths = matchingPaths.filter((cookiePath) => this._isOnPath(cookiePath, path));
      }
      for (const path of matchingPaths) {
        cookies.push(...values(store[domain][path]));
      }
    }
    cookies = cookies.map((cookie) => Cookie.fromJSON(cookie));
    callback(null, cookies);
  }

  /**
   * Returns whether `cookiePath` is on the given `urlPath`
   */
  _isOnPath(cookiePath, urlPath) {
    if (!cookiePath) {
      return false;
    }
    if (cookiePath === urlPath) {
      return true;
    }
    if (!urlPath.startsWith(cookiePath)) {
      return false;
    }
    if (cookiePath[cookiePath.length - 1] !== "/" && urlPath[cookiePath.length] !== "/") {
      return false;
    }
    return true;
  }

  putCookie(cookie, callback) {
    const store = this._readStore();
    set(store, [cookie.domain, cookie.path, cookie.key], cookie);
    this._writeStore(store);
    callback(null);
  }

  updateCookie(oldCookie, newCookie, callback) {
    this.putCookie(newCookie, callback);
  }

  removeCookie(domain, path, key, callback) {
    const store = this._readStore();
    unset(store, [domain, path, key]);
    this._writeStore(store);
    callback(null);
  }

  removeCookies(domain, path, callback) {
    const store = this._readStore();
    if (path == null) {
      unset(store, [domain]);
    } else {
      unset(store, [domain, path]);
    }
    this._writeStore(store);
    callback(null);
  }

  getAllCookies(callback) {
    let cookies = [];
    const store = this._readStore();
    for (const domain of Object.keys(store)) {
      for (const path of Object.keys(store[domain])) {
        cookies.push(...values(store[domain][path]));
      }
    }
    cookies = cookies.map((cookie) => Cookie.fromJSON(cookie));
    cookies.sort((c1, c2) => (c1.creationIndex || 0) - (c2.creationIndex || 0));
    callback(null, cookies);
  }

  _readStore() {
    const json = this.cache.get(STORE_KEY);
    if (json) {
      try {
        return JSON.parse(json);
      } catch (_a) {
        return {};
      }
    }
    return {};
  }
  _writeStore(store) {
    this.cache.set(STORE_KEY, JSON.stringify(store));
  }
}
export default CacheStore;
