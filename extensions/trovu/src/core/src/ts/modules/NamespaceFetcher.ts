/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

/** @module NamespaceFetcher */
import ShortcutVerifier from "./ShortcutVerifier";
import UrlProcessor from "./UrlProcessor";
import jsyaml from "js-yaml";

export default class NamespaceFetcher {
  constructor(env) {
    this.env = env;
    this.namespaceInfos = {};
  }

  /**
   * Gets namespace information for given namespaces
   * @param {Array} namespaces - An array of namespace names
   * @returns {Object} An object containing namespace information
   */
  async getNamespaceInfos(namespaces) {
    this.namespaceInfos = this.getInitialNamespaceInfos(namespaces, 1);
    this.namespaceInfos = await this.assignShortcutsFromData(this.namespaceInfos);
    this.namespaceInfos = this.addNamespaceInfos(this.namespaceInfos);
    this.namespaceInfos = await this.fetchNamespaceInfos(this.namespaceInfos);
    this.namespaceInfos = this.processShortcutsAll(this.namespaceInfos);
    this.namespaceInfos = this.processIncludeAll(this.namespaceInfos);
    this.namespaceInfos = this.addReachable(this.namespaceInfos);
    this.namespaceInfos = this.addInfoAll(this.namespaceInfos);
    this.verifyAll(this.namespaceInfos);
    return this.namespaceInfos;
  }

  /**
   * Gets initial namespace information.
   * @param {Array} namespaces - An array of namespace names
   * @param {number} priorityOffset - The priority offset to use for the namespaces
   * @returns {Object} An object containing initial namespace information
   */
  getInitialNamespaceInfos(namespaces, priorityOffset) {
    const namespaceInfos = {};
    namespaces.forEach((namespace, index) => {
      const namespaceInfo = this.getInitialNamespaceInfo(namespace);
      if (!namespaceInfo) {
        return;
      }
      namespaceInfo.priority = index + priorityOffset;
      namespaceInfos[namespaceInfo.name] = namespaceInfo;
    });
    return namespaceInfos;
  }

  /**
   * Add initial namespace information.
   * @param {(string|Object)} namespace - The namespace to add the URL template to.
   * @return {Object} namespace - The namespace with the added URL template.
   */
  getInitialNamespaceInfo(namespace) {
    if (typeof namespace === "string") {
      return { name: namespace };
    }
    if (!namespace || typeof namespace !== "object") {
      throw new Error("Invalid namespace: input must be an object or a string");
    }
    const namespaceInfo = {};
    if (namespace.name) {
      namespaceInfo.name = namespace.name;
    }
    if (namespace.github) {
      if (namespace.github !== ".") {
        namespaceInfo.github = namespace.github;
      } else {
        if (this.env.github) {
          namespaceInfo.github = this.env.github;
        } else {
          this.env.logger.warning(
            `Invalid namespace: ${JSON.stringify(namespace)} provided without a github repository name.`,
          );
          return false;
        }
      }
      if (!namespaceInfo.name) {
        namespaceInfo.name = namespaceInfo.github;
      }
    }
    if (namespace.url) {
      namespaceInfo.url = namespace.url;
    }
    if (namespace.shortcuts) {
      namespaceInfo.shortcuts = namespace.shortcuts;
    }
    if (!namespaceInfo.name && (namespaceInfo.url || namespaceInfo.shortcuts)) {
      this.env.logger.warning(`Invalid namespace: ${JSON.stringify(namespace)} provided without a name.`);
      return false;
    }
    return namespaceInfo;
  }

  /**
   * Fetches the information for the site namespaces from Trovu server.
   * @param {Object} namespaceInfos - An object of initial namespace infos.
   * @returns {Object} An object containing the fetched information for each given namespace
   */
  async assignShortcutsFromData(namespaceInfos) {
    const data = this.env.data;
    for (const namespaceName in data.shortcuts) {
      if (!namespaceInfos[namespaceName]) {
        namespaceInfos[namespaceName] = {};
      }
      namespaceInfos[namespaceName].name = namespaceName;
      namespaceInfos[namespaceName].shortcuts = data.shortcuts[namespaceName];
    }
    return namespaceInfos;
  }

  /**
   * Adds type and possibly url to namespaceInfos.
   * @param {Object} namespaceInfos
   * @returns {Object} namespaceInfos with added information
   */
  addNamespaceInfos(namespaceInfos) {
    return Object.fromEntries(
      Object.entries(namespaceInfos).map(([name, info]) => {
        const namespaceInfo = this.addNamespaceInfo(info);
        return [name, namespaceInfo];
      }),
    );
  }

  /**
   * Adds type and possibly url to namespaceInfo.
   * @param {Object} namespaceInfo
   * @returns {Object} namespaceInfo with added information
   */
  addNamespaceInfo(namespaceInfo) {
    // No shortcuts means it was in data.json
    // so it must be a site namespace.
    if (namespaceInfo.shortcuts) {
      namespaceInfo.type = "site";
      return namespaceInfo;
    }
    namespaceInfo.type = "user";
    // If it has a URL, it is already well prepared for fetching.
    if (namespaceInfo.url) {
      return namespaceInfo;
    }
    // If still things are missing, assume it is a user namespace via Github,
    // e.g. when it was added as extra namespace.
    if (!namespaceInfo.github) {
      namespaceInfo.github = namespaceInfo.name;
    }
    namespaceInfo.url = `https://raw.githubusercontent.com/${namespaceInfo.github}/trovu-data-user/master/shortcuts.yml`;
    return namespaceInfo;
  }

  /**
   * Fetches the information for the given namespaces from an external source
   * @param {Object} namespaceInfos - An object of initial namespace infos.
   * @returns {Object} An object containing the fetched information for each given namespace
   */
  async fetchNamespaceInfos(namespaceInfos) {
    let i = 0;
    let newNamespaceInfos;
    do {
      i++;
      if (i >= 10) {
        this.env.logger.error(`NamespaceFetcher loop ran already ${i} times.`);
      }
      // Get user namespaces without shortcuts.
      newNamespaceInfos = Object.values(namespaceInfos).filter((item) => item.type === "user" && !item.shortcuts);
      // Get out if no more namespaces to fetch.
      if (newNamespaceInfos.length === 0) {
        break;
      }
      const promises = this.startFetches(newNamespaceInfos);
      const responses = await Promise.all(promises);
      await this.processResponses(newNamespaceInfos, responses);
      for (const namespaceInfo of newNamespaceInfos) {
        namespaceInfos[namespaceInfo.name] = namespaceInfo;
      }
    } while (newNamespaceInfos.length > 0);
    return namespaceInfos;
  }

  /**
   * Start fetching shortcuts per namespace.
   * @param {array} newNamespaceInfos - The namespaces to fetch shortcuts for.
   * @return {array} promises - The promises from the fetch() calls.
   */
  startFetches(newNamespaceInfos) {
    const promises = [];
    for (const namespaceInfo of newNamespaceInfos) {
      // Skip namespaces without URL.
      if (!namespaceInfo.url) {
        continue;
      }
      const promise = fetch(namespaceInfo.url, {
        cache: this.env.reload ? "reload" : "default",
      });
      promises.push(promise);
    }
    return promises;
  }

  /**
   * Processes responses and updates namespace information.
   * @param {Object} newNamespaceInfos - An object containing new namespace information.
   * @param {Array} responses - An array of responses to process.
   * @returns {Object} The updated namespace information object.
   */
  async processResponses(newNamespaceInfos, responses) {
    for (const namespaceInfo of newNamespaceInfos) {
      // Skip namespaces without URL.
      if (!namespaceInfo.url) {
        continue;
      }
      const response = responses.shift();
      if (!response || response.status != 200) {
        this.env.logger.info(`Problem fetching via ${this.env.reload ? "reload" : "default"} ${namespaceInfo.url}`);
        namespaceInfo.shortcuts = {};
        continue;
      }
      this.env.logger.success(`Success fetching via ${this.env.reload ? "reload" : "default"} ${namespaceInfo.url}`);
      const text = await response.text();
      namespaceInfo.shortcuts = this.parseShortcutsFromYml(text, namespaceInfo.url);
      namespaceInfo.shortcuts = this.processShortcuts(namespaceInfo.shortcuts, namespaceInfo.name);
    }
    return newNamespaceInfos;
  }

  processShortcuts(shortcuts, namespaceName) {
    shortcuts = this.checkKeySyntax(shortcuts, namespaceName);
    for (const key in shortcuts) {
      shortcuts[key] = NamespaceFetcher.convertToObject(shortcuts[key]);
      if (shortcuts[key].include) {
        shortcuts[key].include = this.convertIncludeToObject(shortcuts[key].include);
      }
      this.addNamespacesFromInclude(shortcuts[key]);
    }
    return shortcuts;
  }

  /**
   * Parse a YAML string.
   * @param {string} text - String to parse.
   * @param {string} url - The URL of the YAML, for error reporting.
   * @return {object} namespaces - The parsed shortcuts.
   */
  parseShortcutsFromYml(text, url) {
    let shortcuts;
    try {
      shortcuts = jsyaml.load(text);
    } catch (error) {
      this.env.logger.warning(`Warning: Parse error in ${url}: ${error.message}`);
      shortcuts = {};
    }
    return shortcuts;
  }

  /**
   * Ensure shortcuts have the correct structure.
   * @param {array} shortcuts      - The shortcuts to normalize.
   * @param {string} namespaceName - The namespace name to show in error message.
   * @return {array} shortcuts - The normalized shortcuts.
   */
  checkKeySyntax(shortcuts, namespaceName) {
    for (const key in shortcuts) {
      if (!key.match(/\S+ \d/)) {
        this.env.logger.error(
          `Incorrect key "${key}" in namespace ${namespaceName}: Must have form "KEYWORD ARGUMENTCOUNT".`,
        );
      }
    }
    return shortcuts;
  }

  /**
   * Add namespaces that an include refers to,
   * so that they are fetched as well in the next loop.
   * @param {object} shortcut
   * @returns {void}
   */
  addNamespacesFromInclude(shortcut) {
    const includes = this.getIncludes(shortcut);
    for (const include of includes) {
      if (include && include.namespace) {
        const namespaceInfo = this.getInitialNamespaceInfo(include.namespace);
        if (!namespaceInfo) {
          continue;
        }
        if (!this.namespaceInfos[namespaceInfo.name]) {
          this.namespaceInfos[namespaceInfo.name] = this.addNamespaceInfo(namespaceInfo);
        }
      }
    }
  }

  /**
   * Converts a given shortcut to an object
   * @param {string|Object} shortcut - The shortcut to convert
   * @returns {Object} The converted shortcut object
   */
  static convertToObject(shortcut) {
    if (typeof shortcut === "string") {
      const url = shortcut;
      shortcut = {
        url: url,
      };
    }
    return shortcut;
  }

  convertIncludeToObject(include) {
    if (typeof include === "string") {
      const key = include;
      include = {
        key: key,
      };
    }
    return include;
  }

  processShortcutsAll(namespaceInfos) {
    for (const namespaceName in namespaceInfos) {
      const namespaceInfo = namespaceInfos[namespaceName];
      if (namespaceInfo.shortcuts) {
        namespaceInfo.shortcuts = this.processShortcuts(namespaceInfo.shortcuts);
      }
      namespaceInfos[namespaceName] = namespaceInfo;
    }
    return namespaceInfos;
  }

  /**
   * Process all includes in the given namespace infos.
   * @param {object} namespaceInfos
   * @returns {object} The processed namespace infos
   */
  processIncludeAll(namespaceInfos) {
    for (const namespaceName in namespaceInfos) {
      const namespaceInfo = namespaceInfos[namespaceName];
      const shortcuts = namespaceInfo.shortcuts;
      for (const key in shortcuts) {
        const shortcut = shortcuts[key];
        if (!shortcut.include) {
          continue;
        }
        shortcuts[key] = this.processInclude(shortcut, namespaceName, namespaceInfos);
        if (!shortcuts[key]) {
          delete shortcuts[key];
        }
      }
    }
    return namespaceInfos;
  }

  /**
   * Process an include.
   * @param {object} shortcut - The shortcut to process.
   * @param {string} namespaceName - The namespace name.
   * @param {object} namespaceInfos - The namespace infos.
   * @param {number} depth - The depth of the include.
   * @returns {object} The processed shortcut.
   */
  processInclude(shortcut, namespaceName, namespaceInfos, depth = 0) {
    if (depth >= 10) {
      this.env.logger.error(`NamespaceFetcher loop ran already ${depth} times.`);
    }
    const includes = this.getIncludes(shortcut);
    for (const include of includes) {
      if (!include.key) {
        this.env.logger.error(`Include with missing key at: ${JSON.stringify(include)}`);
      }
      const keyUnprocessed = include.key;
      const key = UrlProcessor.replaceVariables(keyUnprocessed, {
        language: this.env.language,
        country: this.env.country,
      });
      namespaceName = include.namespace || namespaceName;
      if (!namespaceInfos[namespaceName] || !namespaceInfos[namespaceName].shortcuts) {
        this.env.logger.warning(`Namespace "${namespaceName}" does not exist or has no shortcuts.`);
        continue;
      }
      let shortcutToInclude = namespaceInfos[namespaceName].shortcuts[key];
      if (!shortcutToInclude) {
        continue;
      }
      if (shortcutToInclude.include) {
        shortcutToInclude = this.processInclude(shortcutToInclude, namespaceName, namespaceInfos, depth + 1);
      }
      if (Object.keys(shortcutToInclude).length === 0) {
        continue;
      }
      const shortcutToIncludeCloned = this.cloneShortcut(shortcutToInclude);
      shortcut = Object.assign(shortcutToIncludeCloned, shortcut);
      return shortcut;
    }
    return false;
  }

  /**
   * Gets the includes from a given shortcut
   * @param {Object} shortcut - The shortcut to get the includes from
   * @returns {Array} An array of includes
   */
  getIncludes(shortcut) {
    let includes = [];
    if (Array.isArray(shortcut.include)) {
      includes = shortcut.include;
    } else {
      includes.push(shortcut.include);
    }
    return includes;
  }

  /**
   * Clones a given shortcut object
   * @param {Object} shortcut - The shortcut object to clone
   * @returns {Object} The cloned shortcut object
   */
  cloneShortcut(shortcut) {
    // This approach seems more browser-supported than structuredClone().
    const str = JSON.stringify(shortcut);
    const clonedShortcut = JSON.parse(str);
    return clonedShortcut;
  }

  /**
   * Enrich shortcuts with their own information: argument & namespace names, reachable.
   *
   * @param {object} namespaces - Current namespaces keyed by their name.
   */
  addReachable(namespaceInfos) {
    const namespaceInfosByPriority = Object.values(namespaceInfos).sort((a, b) => {
      return b.priority - a.priority;
    });

    // Remember found shortcuts
    // to know which ones are reachable.
    const foundShortcuts = new Set();

    for (const namespaceInfo of namespaceInfosByPriority) {
      if (!this.isSubscribed(namespaceInfo)) {
        continue;
      }
      for (const key in namespaceInfo.shortcuts) {
        // If not yet present: reachable.
        namespaceInfo.shortcuts[key].reachable = !foundShortcuts.has(key);
        foundShortcuts.add(key);
      }
    }
    return namespaceInfos;
  }

  addInfoAll(namespaceInfos) {
    for (const namespaceInfo of Object.values(namespaceInfos)) {
      for (const key in namespaceInfo.shortcuts) {
        namespaceInfo.shortcuts[key] = NamespaceFetcher.addInfo(namespaceInfo.shortcuts[key], key, namespaceInfo.name);
      }
    }
    return namespaceInfos;
  }

  /**
   *  Add info like keyword, arguments to a shortcut.
   *
   * @param {object} shortcut - The shortcut.
   * @param {string} key - The shortcut key.
   * @param {object} namespaceInfo - The namespace info.
   *
   * @return {object} shortcut - Shortcut with info.
   */
  static addInfo(shortcut, key, namespaceName) {
    shortcut = NamespaceFetcher.convertToObject(shortcut);
    shortcut.key = key;
    [shortcut.keyword, shortcut.argumentCount] = key.split(" ");
    shortcut.argumentCount = parseInt(shortcut.argumentCount);
    shortcut.namespace = namespaceName;
    shortcut.arguments = UrlProcessor.getArgumentsFromString(shortcut.url);
    shortcut.argumentString = NamespaceFetcher.getArgumentString(shortcut.arguments);
    shortcut.title = shortcut.title || "";
    return shortcut;
  }

  static getArgumentString(args) {
    const icons = {
      city: "🏙️",
      date: "📅",
      time: "🕒",
    };

    const argumentsAsString = Object.entries(args).map(([key, value]) => {
      const type = (value && Object.values(value)[0] && Object.values(value)[0].type) || null;
      const icon = icons[type] || "";
      return `${icon} ${key}`.trim();
    });

    const argumentString = argumentsAsString.join(", ");

    return argumentString;
  }

  verifyAll(namespaceInfos) {
    for (const namespaceInfo of Object.values(namespaceInfos)) {
      for (const key in namespaceInfo.shortcuts) {
        this.verify(namespaceInfo.shortcuts[key]);
      }
    }
    return namespaceInfos;
  }

  verify(shortcut) {
    const error = ShortcutVerifier.checkIfHasUrl(shortcut);
    if (error) {
      this.env.logger.error(error);
    }
    const warning = ShortcutVerifier.checkIfArgCountMatches(shortcut);
    if (warning) {
      this.env.logger.warning(warning);
    }
  }

  /**
   * Check if namespace is subscribed to.
   *
   * @param {object} namespaceInfo - namespace to be checked.
   *
   * @return {boolean} isSubscribed - TRUE if subscribed.
   */
  isSubscribed(namespaceInfo) {
    return namespaceInfo.priority && namespaceInfo.priority > 0;
  }
}
