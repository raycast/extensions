/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/** @module Helper */

/** Helper methods. */

export default class Helper {
  /**
   * Fetch the content of a file behind an URL.
   *
   * @param {string} url    - The URL of the file to fetch.
   * @param {object} env    - Environment object containing:
   *                          reload: boolean - Whether to bypass cache
   *                          logger: {info: Function, success: Function} - Logging methods
   *
   * @return {string} text  - The content.
   */
  static async fetchAsync(url, env) {
    const requestCache = env.reload ? "reload" : "force-cache";
    const response = await fetch(url, {
      cache: requestCache,
    });
    if (response.status !== 200) {
      env.logger.info(`Problem fetching via ${requestCache} ${url}: ${response.status}`);
      return null;
    }
    env.logger.success(`Success fetching via ${requestCache} ${url}`);
    const text = await response.text();
    return text;
  }
}
