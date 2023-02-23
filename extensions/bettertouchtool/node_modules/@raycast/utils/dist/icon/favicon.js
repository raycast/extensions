"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFavicon = void 0;
const api_1 = require("@raycast/api");
const url_1 = require("url");
/**
 * Icon showing the favicon of a website.
 *
 * A favicon (favorite icon) is a tiny icon included along with a website, which is displayed in places like the browser's address bar, page tabs, and bookmarks menu.
 *
 * @param url The URL of the website to represent.
 *
 * @returns an Image that can be used where Raycast expects them.
 *
 * @example
 * ```
 * <List.Item icon={getFavicon("https://raycast.com")} title="Raycast Website" />
 * ```
 */
function getFavicon(url, options) {
    try {
        const urlObj = typeof url === "string" ? new url_1.URL(url) : url;
        const hostname = urlObj.hostname;
        return {
            source: `https://www.google.com/s2/favicons?sz=${options?.size ?? 64}&domain=${hostname}`,
            fallback: options?.fallback ?? api_1.Icon.Link,
            mask: options?.mask,
        };
    }
    catch (e) {
        console.error(e);
        return api_1.Icon.Link;
    }
}
exports.getFavicon = getFavicon;
