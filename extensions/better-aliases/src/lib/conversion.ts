import type { BetterAliasesConfig, LeaderKeyAction, LeaderKeyConfig } from "../schemas";

/**
 * Traverses Leader Key actions and flattens them into Better Aliases config.
 */
export function convertLeaderKeyToAliases(config: LeaderKeyConfig): BetterAliasesConfig {
  const result: BetterAliasesConfig = {};

  function traverse(actions: LeaderKeyAction[], currentPath: string = "") {
    if (!Array.isArray(actions)) return;

    for (const action of actions) {
      if (!action || !action.key) continue;

      const fullPath = currentPath + action.key;

      if (action.type === "group" && action.actions) {
        traverse(action.actions, fullPath);
      } else if (action.value) {
        result[fullPath] = {
          value: action.value,
          label: action.label,
          snippetOnly: false,
        };
      }
    }
  }

  if (config.actions) {
    traverse(config.actions);
  }

  return result;
}

/**
 * Converts Better Aliases config into a nested Leader Key config structure.
 */
export function convertAliasesToLeaderKey(config: BetterAliasesConfig): LeaderKeyConfig {
  const rootActions: LeaderKeyAction[] = [];

  function getOrAddGroup(actions: LeaderKeyAction[], key: string): LeaderKeyAction {
    let group = actions.find((a) => a.key === key && a.type === "group");
    if (!group) {
      group = {
        key,
        type: "group",
        label: key,
        actions: [],
      };
      actions.push(group);
    }
    return group;
  }

  function inferType(value: string): "url" | "application" | "command" {
    if (value.startsWith("http://") || value.startsWith("https://")) return "url";
    if (value.startsWith("/")) return "application";
    return "command";
  }

  for (const [alias, item] of Object.entries(config)) {
    const keys = alias.split("");
    let currentLevel = rootActions;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLast = i === keys.length - 1;

      if (isLast) {
        currentLevel.push({
          key,
          label: item.label || key,
          value: item.value,
          type: inferType(item.value),
        });
      } else {
        const group = getOrAddGroup(currentLevel, key);
        currentLevel = group.actions ?? [];
        group.actions = currentLevel;
      }
    }
  }

  return { actions: rootActions };
}
