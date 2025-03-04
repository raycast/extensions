/** @module Env */
import Helper from "./Helper.js";
import Logger from "./Logger.js";
import NamespaceFetcher from "./NamespaceFetcher.js";
import QueryParser from "./QueryParser.js";
import UrlProcessor from "./UrlProcessor.js";
import countriesList from "countries-list";
import jsyaml from "js-yaml";

/** Set and remember the environment. */

export default class Env {
  /**
   * Set helper variables.
   *
   * @param {object} env - The environment variables.
   */
  constructor(env) {
    countriesList.languages["eo"] = { name: "Esperanto", native: "Esperanto" };
    this.setToThis(env);
    this.logger = new Logger("#log");
    this.setGit();
  }

  setGit() {
    if (typeof GIT_INFO === "object") {
      // eslint-disable-next-line no-undef
      this.gitInfo = GIT_INFO;
    } else {
      this.gitInfo = {
        commit: {
          hash: "unknown",
          date: "unknown",
        },
      };
    }
  }

  /**
   * Set the environment variables from the given object.
   *
   * @param {object} env - The environment variables.
   * @returns {void}
   */
  setToThis(env) {
    if (!env) {
      return;
    }
    for (const key in env) {
      this[key] = env[key];
    }
  }

  /**
   * Get the params from env.
   *
   * @return {object} - The built params.
   */
  buildUrlParams(originalParams = {}, moreParams = {}) {
    const params = {};

    if (this.github) {
      params.github = this.github;
    } else if (originalParams.configUrl) {
      params.configUrl = originalParams.configUrl;
    } else {
      params.language = this.language;
      params.country = this.country;
    }
    if (originalParams.defaultKeyword) {
      params.defaultKeyword = originalParams.defaultKeyword;
    }
    if (this.debug) {
      params.debug = 1;
    }
    for (const property of ["alternative", "key", "namespace", "status", "query"]) {
      if (this[property]) {
        params[property] = this[property];
      }
    }
    Object.assign(params, moreParams);
    return params;
  }

  /**
   * Get the parameters as string.
   */
  buildUrlParamStr(moreParams = {}) {
    const originalParams = Env.getParamsFromUrl();
    const params = this.buildUrlParams(originalParams, moreParams);
    const urlSearchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => urlSearchParams.set(key, value));
    urlSearchParams.sort();
    const paramStr = urlSearchParams.toString();
    return paramStr;
  }

  buildProcessUrl(moreParams) {
    const paramStr = this.buildUrlParamStr(moreParams);
    const processUrl = "process/index.html?#" + paramStr;
    return processUrl;
  }

  /**
   * Set the initial class environment vars either from params or from GET hash string.
   *
   * @param {array} params - List of parameters to be used in environment.
   */
  async populate(params) {
    this.fetch = await this.getFetch();
    this.data = this.data || (await this.getData());

    if (this.data.config.defaultKeyword) {
      this.defaultKeyword = this.data.config.defaultKeyword;
    }

    if (!params) {
      params = Env.getParamsFromUrl();
    }

    const boolParams = Env.getBoolParams(params);
    Object.assign(this, boolParams);

    // Assign before, to also catch "debug" and "reload" in params and query.
    Object.assign(this, params);
    const params_from_query = QueryParser.parse(this.query);
    Object.assign(this, params_from_query);

    this.getFromLocalStorage();

    if (typeof params.github === "string" && params.github !== "") {
      this.configUrl = this.buildGithubConfigUrl(params.github);
    }
    if (typeof params.configUrl === "string" && params.configUrl !== "") {
      this.configUrl = params.configUrl;
    }
    if (this.configUrl) {
      const config = await this.getUserConfigFromUrl(this.configUrl);
      if (config) {
        Object.assign(this, config);
      }
    }
    // Assign again, to override user config.
    Object.assign(this, params);
    Object.assign(this, params_from_query);

    this.setDefaults();

    this.setToLocalStorage();

    // Add extra namespace to namespaces.
    if (this.extraNamespaceName) {
      this.namespaces.push(this.extraNamespaceName);
    }

    this.namespaceInfos = await new NamespaceFetcher(this).getNamespaceInfos(this.namespaces);

    // Remove extra namespace if it turned out to be invalid.
    if (this.extraNamespaceName && !this.isValidNamespace(this.extraNamespaceName)) {
      delete this.extraNamespaceName;
      this.keyword = "";
      this.arguments = [this.query];
    }
  }

  setToLocalStorage() {
    /* eslint-disable no-undef */
    if (typeof localStorage === "undefined") {
      return;
    }
    if (this.github) {
      localStorage.setItem("github", this.github);
      localStorage.removeItem("language");
      localStorage.removeItem("country");
    } else {
      localStorage.setItem("language", this.language);
      localStorage.setItem("country", this.country);
      localStorage.removeItem("github");
    }
    /* eslint-enable no-undef */
  }

  getFromLocalStorage() {
    /* eslint-disable no-undef */
    if (typeof localStorage === "undefined") {
      return;
    }
    this.language ||= localStorage.getItem("language");
    this.country ||= localStorage.getItem("country");
    this.github ||= localStorage.getItem("github");
    /* eslint-enable no-undef */
  }

  static getBoolParams(params) {
    const boolParams = {};
    for (const paramName of ["debug", "reload"]) {
      if (params[paramName] === "1") {
        boolParams[paramName] = true;
      }
    }
    return boolParams;
  }

  /**
   * Get the URL to the config file on Github.
   * @param {string} github - The Github user name.
   * @returns {string} The URL to the config file.
   */
  buildGithubConfigUrl(github) {
    const configUrl = `https://raw.githubusercontent.com/${github}/trovu-data-user/master/config.yml`;
    return configUrl;
  }

  /**
     Check if namespace is valid.
   * @param {string} namespace 
   * @returns {boolean}
   */
  isValidNamespace(namespace) {
    if (
      namespace in this.namespaceInfos &&
      this.namespaceInfos[namespace].shortcuts &&
      !this.isEmptyObject(this.namespaceInfos[namespace].shortcuts)
    ) {
      return true;
    }
    if (namespace in countriesList.languages) {
      return true;
    } else if (namespace.substring(1).toUpperCase() in countriesList.countries) {
      return true;
    }
    return false;
  }

  /**
   * Checks if object is empty.
   * @param {Object} obj
   * @returns {boolean}
   */
  isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
  }

  /**
   * Get the user configuration from a URL.
   * @param {string} configUrl - The URL to the config file.
   * @returns {(object|boolean)} config - The user's config object, or false if fetch failed.
   */

  async getUserConfigFromUrl(configUrl) {
    const configYml = await Helper.fetchAsync(configUrl, this);
    if (!configYml) {
      this.logger.warning(`Problem reading config from ${configUrl}`);
    }
    try {
      const config = jsyaml.load(configYml);
      return config;
    } catch (error) {
      this.logger.error(`Error parsing ${configUrl}: ${error.message}`);
    }
  }

  /**
   * Set default language and country if they are still empty.
   * @returns {void}
   */
  setDefaultLanguageAndCountry() {
    if (
      this.language in countriesList.languages &&
      typeof this.country === "string" &&
      this.country.toUpperCase() in countriesList.countries
    ) {
      return;
    }

    const { language, country } = this.getDefaultLanguageAndCountry();

    // Default language.
    if (!(this.language in countriesList.languages)) {
      this.language = language;
    }
    // Default country.
    if (!this.country || !(this.country.toUpperCase() in countriesList.countries)) {
      this.country = country;
    }
  }

  /**
   * Get the default language and country from browser.
   *
   * @return {object} [language, country] - The default language and country.
   */
  getDefaultLanguageAndCountry() {
    let { language, country } = this.getLanguageAndCountryFromBrowser();

    // Make sure language and country are in our lists.
    if (!(language in countriesList.languages)) {
      language = this.data.config.language;
    }
    if (!country || !(country.toUpperCase() in countriesList.countries)) {
      country = this.data.config.country;
    }

    // Ensure lowercase.
    language = language.toLowerCase();
    country = country.toLowerCase();

    return { language, country };
  }

  /**
   * Get the default language and country from browser.
   *
   * @return {object} [language, country] - The default language and country.
   */
  getLanguageAndCountryFromBrowser() {
    const languageStr = this.getNavigatorLanguage();
    let language, country;
    if (languageStr) {
      [language, country] = languageStr.split("-");
    }

    return { language, country };
  }

  /**
   * Wrapper for navigator language, capsuled to enable unit testing.
   *
   * @return {string} navigatorLanguage - The browser's value of navigator.language.
   */
  getNavigatorLanguage() {
    if (typeof navigator === "undefined") {
      return "";
    }
    // eslint-disable-next-line no-undef
    const languageStr = navigator.language;
    return languageStr;
  }

  /**
   * Set default environment variables if they are still empty.
   */
  setDefaults() {
    this.setDefaultLanguageAndCountry();

    // Default namespaces.
    if (typeof this.namespaces != "object") {
      this.namespaces = this.data.config.namespaces;
      this.namespaces = this.namespaces.map((namespace) => UrlProcessor.replaceVariables(namespace, this));
    }
    // Default debug.
    if (typeof this.debug != "boolean") {
      this.debug = Boolean(this.debug);
    }
  }

  /**
   * Fetches data from /data.
   * @returns {Object} An object containing the fetched data.
   */
  async getData() {
    let text;
    let url;
    switch (this.context) {
      case "browser":
        url = `/data.json?${this.gitInfo.commit.hash}`;
        text = await Helper.fetchAsync(url, this);
        break;
      case "raycast":
        url = "https://trovu.net/data.json";
        text = await Helper.fetchAsync(url, this);
        break;
      case "node": {
        // eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
        const fs = require("fs");
        url = "./dist/public/data.json";
        text = fs.readFileSync(url, "utf8");
        break;
      }
    }
    if (!text) {
      return false;
    }
    try {
      const data = await JSON.parse(text);
      return data;
    } catch (error) {
      this.logger.error(`Error parsing JSON in ${url}: ${error.message}`);
      return false;
    }
  }

  /**
   * From 'http://example.com/foo#bar=baz' get 'bar=baz'.
   *
   * @return {string} hash - The hash string.
   */
  static getUrlHash() {
    if (typeof window === "undefined") {
      return "";
    }
    // eslint-disable-next-line no-undef
    const hash = window.location.hash.substr(1);
    return hash;
  }

  static getParamsFromUrl() {
    const urlSearchParams = this.getUrlSearchParams();
    const params = {};
    urlSearchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  static getUrlSearchParams() {
    const urlHash = this.getUrlHash();
    const urlSearchParams = new URLSearchParams(urlHash);
    return urlSearchParams;
  }

  isRunningStandalone() {
    /* eslint-disable no-undef */
    return window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
    /* eslint-enable no-undef */
  }
  async getFetch() {
    // Can't work with this.context here
    // as rollup seems not able to handle it.
    if (typeof fetch !== "undefined") {
      // Browser and Node
      // eslint-disable-next-line no-undef
      return fetch.bind(window);
    } else {
      // Raycast
      const { default: nodeFetch } = await import("node-fetch");
      return nodeFetch;
    }
  }
}
