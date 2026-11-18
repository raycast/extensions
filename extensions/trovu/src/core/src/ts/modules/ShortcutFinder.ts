/** @module ShortcutFinder */

/** Find matching shortcut. */

export default class ShortcutFinder {
  /**
   * Match shortcuts for keyword and args.
   *
   * @param {string} keyword    - The keyword of the query.
   * @param {array} args        - The arguments of the query.
   *
   * @return {array} shortcuts  - The array of found shortcuts.
   */
  static matchShortcuts(keyword: string, args: any[], namespaceInfos: AnyObject, includeNonReachable = false) {
    for (const namespaceInfo of Object.values(namespaceInfos)) {
      if (!namespaceInfo.shortcuts) {
        continue;
      }
      const shortcut = namespaceInfo.shortcuts[keyword + " " + args.length];
      if (shortcut && (shortcut.reachable || includeNonReachable)) {
        return shortcut;
      }
    }
  }

  /**
   * Collect shortcuts from all available namespace.
   *
   * @param {object} env        - The environment.
   *
   * @return {object} shortcuts - Found shortcuts keyed by their source namespace.
   */
  static findShortcut(env: AnyObject) {
    let shortcut = this.matchShortcuts(env.keyword, env.args, env.namespaceInfos);

    // If nothing found:
    // Try without commas, i.e. with the whole argumentString as the only argument.
    if (!shortcut && env.args.length > 0) {
      env.logger.info(
        `No shortcut found for ${env.keyword} ${env.args.length} yet. Trying with the whole argument string as the only argument.`,
      );
      shortcut = this.matchShortcuts(env.keyword, [env.argumentString], env.namespaceInfos);
      if (shortcut) {
        env.args = [env.argumentString];
      }
    }

    // If nothing found:
    // Try default keyword.
    if (!shortcut && env.defaultKeyword) {
      env.logger.info(`No shortcut found for ${env.keyword} ${env.args.length} yet. Trying with default keyword.`);
      shortcut = this.matchShortcuts(env.defaultKeyword, [env.query], env.namespaceInfos);
      if (shortcut) {
        env.args = [env.query];
      }
    }
    // If still nothing found:
    // Try with non-reachable, to inform.
    if (!shortcut) {
      env.logger.info(`No shortcut found for ${env.keyword} ${env.args.length} yet. Trying with non-reachable.`);
      shortcut = this.matchShortcuts(env.keyword, env.args, env.namespaceInfos, true);
    }
    return shortcut;
  }
}
