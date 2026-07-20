import { useMemo } from "react";
import { loadBetterAliases } from "../lib/betterAliases";
import { type AliasNode, buildAliasTree } from "../lib/treeUtils";

export function useBetterAliasesTree(): AliasNode {
  return useMemo(() => {
    const config = loadBetterAliases();
    return buildAliasTree(config);
  }, []);
}
