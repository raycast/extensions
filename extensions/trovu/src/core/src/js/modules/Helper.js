/** @module Helper */

/** Helper methods. */

export default class Helper {
  /**
   * Split a string n times, keep all additional matches in the last part as one string.
   *
   * @param {string} str        - The string to split.
   * @param {string} delimiter  - The string or regexp to split at.
   * @param {int} n             - Max. number of resulting parts.
   *
   * @return {array} parts      - The splitted parts.
   */
  static splitKeepRemainder(string, delimiter, n) {
    if (!string) {
      return [];
    }
    const parts = string.split(delimiter);
    return parts.slice(0, n - 1).concat([parts.slice(n - 1).join(delimiter)]);
  }

  /**
   * Fetch the content of a file behind an URL.
   *
   * @param {string} url    - The URL of the file to fetch.
   *
   * @return {string} text  - The content.
   */
  static async fetchAsync(url, env) {
    const requestCache = env.reload ? "reload" : "default";
    const response = await env.fetch(url, {
      cache: requestCache,
    });
    if (response.status != 200) {
      env.logger.info(`Problem fetching via ${requestCache} ${url}: ${response.status}`);
      return null;
    }
    env.logger.success(`Success fetching via ${requestCache} ${url}`);
    const text = await response.text();
    return text;
  }
}
