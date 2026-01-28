/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/** @module QueryParser */
import countriesList from "countries-list";
import splitLimit from "split-limit";

/** Parse a query. */

export default class QueryParser {
  /**
   * Parse the query into its all details.
   *
   * @param {string} query          - The whole query.
   *
   * @return {object}               - Contains various values parsed from the query.
   */
  static parse(query) {
    const env = {};
    env.query = query || "";
    env.query = env.query.trim();
    Object.assign(env, QueryParser.setFlagsFromQuery(env));

    [env.keyword, env.argumentString] = this.getKeywordAndArgumentString(env.query);
    env.keyword = env.keyword.toLowerCase();
    env.args = this.getArguments(env.argumentString);

    [env.extraNamespaceName, env.keyword] = this.getExtraNamespace(env.keyword);
    if (env.extraNamespaceName) {
      const languageOrCountry = this.getLanguageAndCountryFromExtraNamespaceName(env.extraNamespaceName);
      Object.assign(env, languageOrCountry);
    }

    return env;
  }

  /**
   * Get keyword and argument string from query.
   *
   * @param {string} query          - The whole query.
   *
   * @return {object}
   * - {string} keyword           - The keyword from the query.
   * - {string} argumentString    - The whole argument string.
   */
  static getKeywordAndArgumentString(query) {
    let keyword, argumentString;

    [keyword, argumentString] = splitLimit(query, " ", 2);

    if (typeof keyword === "undefined") {
      keyword = "";
    }
    if (typeof argumentString === "undefined") {
      argumentString = "";
    }

    return [keyword, argumentString];
  }

  /**
   * Get arguments from argument string.
   *
   * @param {string} argumentString    - The whole argument string.
   *
   * @return {array} args              - The arguments from the argument string.
   */
  static getArguments(argumentString) {
    let args;
    if (argumentString) {
      args = argumentString.split(",");
    } else {
      args = [];
    }

    return args;
  }

  /**
   * Check if keyword contains extra namespace.
   *
   * @param {string} keyword - The keyword.
   *
   * @return {object}
   * - {string} extraNamespaceName - If found, the name of the extra namespace.
   * - {string} keyword            - The new keyword.
   */
  static getExtraNamespace(keyword) {
    // Check for extraNamespace in keyword:
    //   split at dot
    //   but don't split up country namespace names.
    let extraNamespaceName;
    if (keyword.match(/.\./)) {
      [extraNamespaceName, keyword] = splitLimit(keyword, ".", 2);
      // If extraNamespace started with a dot, it will be empty
      // so let's split it again, and add the dot.
      if (extraNamespaceName === "") {
        [extraNamespaceName, keyword] = splitLimit(keyword, ".", 2);
        extraNamespaceName = "." + extraNamespaceName;
      }
    }

    return [extraNamespaceName, keyword];
  }

  /**
   * Return language or country from extra namespace.
   *
   * @param {string} extraNamespaceName - The name of the extraNamespace.
   *
   * @return {object}               - Contains either {language: } or {country: }.
   */
  static getLanguageAndCountryFromExtraNamespaceName(extraNamespaceName) {
    const env = {};

    if (extraNamespaceName in countriesList.languages) {
      env.language = extraNamespaceName;
    } else if (extraNamespaceName.substring(1).toUpperCase() in countriesList.countries) {
      env.country = extraNamespaceName.substring(1);
    }

    return env;
  }

  static setFlagsFromQuery(env) {
    if (env.query) {
      // Check for debug.
      if (env.query.match(/^debug:/)) {
        env.debug = true;
        env.query = env.query.replace(/^debug:/, "");
      }
      // Check for reload.
      if (env.query.match(/^reload:/) || env.query.match(/^reload$/)) {
        env.reload = true;
        env.query = env.query.replace(/^reload(:?)/, "");
      }
    }
    return env;
  }
}
