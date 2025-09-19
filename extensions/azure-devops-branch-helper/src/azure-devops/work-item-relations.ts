/**
 * Work item relations and hierarchy operations
 */

import { getPreferenceValues } from "@raycast/api";
import { runAz } from "../az-cli";
import { getWorkItemLite } from "./work-item-operations";
import type {
  Preferences,
  RelationItem,
  WorkItemLite,
  WorkItemRelations,
} from "./types";

/**
 * Extracts work item ID from Azure DevOps API URL
 */
function extractWorkItemId(url: string): number | null {
  const m = url.match(/workItems\/(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Gets related work items (parent, siblings, children, related) for a given work item
 */
export async function getRelatedWorkItems(
  workItemId: number,
): Promise<WorkItemRelations> {
  const preferences = getPreferenceValues<Preferences>();

  let parent: WorkItemLite | null = null;
  let siblings: WorkItemLite[] = [];
  let relatedItems: WorkItemLite[] = [];
  let children: WorkItemLite[] = [];

  try {
    // Fetch work item with relations expanded
    const { stdout: relStdout } = await runAz([
      "boards",
      "work-item",
      "show",
      "--id",
      String(workItemId),
      "--output",
      "json",
      "--expand",
      "relations",
      ...(preferences.azureOrganization
        ? ["--organization", preferences.azureOrganization]
        : []),
    ]);
    const withRels = JSON.parse(relStdout);
    const relations: RelationItem[] = withRels.relations || [];

    // Children of the current item (Hierarchy-Forward)
    const childIds = relations
      .filter((r) => r.rel?.toLowerCase().includes("hierarchy-forward"))
      .map((r) => extractWorkItemId(r.url))
      .filter((id): id is number => !!id)
      .slice(0, 25);
    if (childIds.length) {
      const fetched = await Promise.all(
        childIds.map((id) => getWorkItemLite(id)),
      );
      children = fetched.filter((w): w is WorkItemLite => !!w);
    }

    // Parent and siblings (Hierarchy-Reverse)
    const parentRel = relations.find((r) =>
      r.rel?.toLowerCase().includes("hierarchy-reverse"),
    );
    if (parentRel) {
      const parentId = extractWorkItemId(parentRel.url);
      if (parentId) {
        parent = await getWorkItemLite(parentId);

        // Get siblings by fetching parent's children
        const { stdout: parentRelsStdout } = await runAz([
          "boards",
          "work-item",
          "show",
          "--id",
          String(parentId),
          "--output",
          "json",
          "--expand",
          "relations",
          ...(preferences.azureOrganization
            ? ["--organization", preferences.azureOrganization]
            : []),
        ]);
        const parentWithRels = JSON.parse(parentRelsStdout);
        const parentRels: RelationItem[] = parentWithRels.relations || [];
        const siblingIds = parentRels
          .filter((r) => r.rel?.toLowerCase().includes("hierarchy-forward"))
          .map((r) => extractWorkItemId(r.url))
          .filter((id): id is number => !!id && id !== workItemId)
          .slice(0, 25);
        if (siblingIds.length) {
          const fetched = await Promise.all(
            siblingIds.map((id) => getWorkItemLite(id)),
          );
          siblings = fetched.filter((w): w is WorkItemLite => !!w);
        }
      }
    }

    // Related items (non-hierarchical relationships)
    const relatedIds = relations
      .filter((r) => r.rel?.toLowerCase().includes("system.linktypes.related"))
      .map((r) => extractWorkItemId(r.url))
      .filter((id): id is number => !!id)
      .slice(0, 25);
    if (relatedIds.length) {
      const fetched = await Promise.all(
        relatedIds.map((id) => getWorkItemLite(id)),
      );
      relatedItems = fetched.filter((w): w is WorkItemLite => !!w);
    }
  } catch (error) {
    console.error("Failed to get related work items:", error);
  }

  return { parent, siblings, related: relatedItems, children };
}
