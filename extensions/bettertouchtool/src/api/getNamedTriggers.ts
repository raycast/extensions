import { NamedTriggerGroup, NamedTrigger, Result } from "../types";
import { getPreferenceValues } from "@raycast/api";
import { createJXAScript } from "../constants";
import { runAppleScript } from "@raycast/utils";
import { returnErrorText, isErrorResponse } from "./utils";

function flattenGroups(groups: NamedTriggerGroup[]): Record<string, string> {
  // Create a map for quick lookup of groups by UUID
  const groupMap: Record<string, NamedTriggerGroup> = {};
  groups.forEach((group) => {
    groupMap[group.uuid] = group;
  });

  // Function to build the full path for a group
  function buildGroupPath(group: NamedTriggerGroup, visited = new Set<string>()): string {
    if (!group.parentUUID) {
      return group.name;
    }

    if (visited.has(group.uuid)) {
      return group.name; // Break circular dependency
    }
    visited.add(group.uuid);

    const parent = groupMap[group.parentUUID];
    if (!parent) {
      return group.name;
    }

    return `${buildGroupPath(parent, visited)} > ${group.name}`;
  }

  // Create the flattened result
  const result: Record<string, string> = {};
  groups.forEach((group) => {
    result[group.uuid] = buildGroupPath(group);
  });

  return result;
}

export async function getNamedTriggers(): Promise<Result<NamedTrigger[]>> {
  const { bttSharedSecret: secret } = getPreferenceValues();
  const getTriggers = (btt: string, id: number) => {
    if (!secret) {
      return `${btt}.get_triggers({ trigger_id: ${id} })`;
    }
    return `${btt}.get_triggers({ trigger_id: ${id}, shared_secret: ${JSON.stringify(secret)} })`;
  };
  const getTriggersJXA = createJXAScript(
    (btt) => `
  try {
    const groupData = JSON.parse(${getTriggers(btt, 630)}).map(x => ({ 
      uuid: x.BTTUUID, 
      name: x.BTTGroupName, 
      ... (x.BTTTriggerParentUUID ? { parentUUID: x.BTTTriggerParentUUID } : {})
    }));
    
    const triggerData = JSON.parse(${getTriggers(btt, 643)}).map(x => {
      const { BTTIconData, ...withoutIconData } = x;
      return withoutIconData;
    });
    
    const result = {
      groups: groupData,
      triggers: triggerData
    };
    return JSON.stringify(result);
  } catch (e) {
    ${returnErrorText("Could not run JXA script but BTT reported that it was running", "e")};
  }`,
  );
  try {
    const execData = await runAppleScript(getTriggersJXA, {
      language: "JavaScript",
    });
    if (isErrorResponse(execData)) {
      const trimmedError = execData.replace("error:", "AppleScript Error:").trim();
      return { status: "error", error: trimmedError };
    }
    const parsedData = JSON.parse(execData) as BTTGetTriggersResult;

    // Create a map of group UUIDs to their full path names
    const groupMap = flattenGroups(parsedData.groups);

    const mapped = parsedData.triggers.map(
      (trigger): NamedTrigger => ({
        uuid: trigger.BTTUUID,
        name: trigger.BTTTriggerName || "",
        enabled: trigger.BTTEnabled === 1 && trigger.BTTEnabled2 === 1,
        actions:
          trigger.BTTAdditionalActions?.map((action) => ({
            name: action.BTTPredefinedActionName || action.BTTLayoutIndependentActionChar || "Unknown Action",
            enabled: action.BTTEnabled === 1 && action.BTTEnabled2 === 1,
          })) || [],
        groupName: trigger.BTTTriggerParentUUID ? groupMap[trigger.BTTTriggerParentUUID] : undefined,
      }),
    );
    return { status: "success", data: mapped };
  } catch (e) {
    if (e instanceof Error) {
      return { status: "error", error: e.message };
    }
    return { status: "error", error: "Unknown error" };
  }
}

interface BTTAdditionalAction {
  BTTPredefinedActionName?: string;
  BTTLayoutIndependentActionChar?: string;
  BTTEnabled: number;
  BTTEnabled2: number;
  BTTOrder: number;
}

interface BTTTrigger {
  BTTUUID: string;
  // Doesn't seem to be present when using named triggers
  BTTGestureNotes?: string;
  // "Empty Placeholder" when using named triggers
  BTTPredefinedActionName: string;
  // Doesn't seem to be present when using named triggers
  BTTGenericActionConfig?: string;
  BTTTriggerName: string;
  BTTEnabled: number;
  BTTEnabled2: number;
  BTTAdditionalActions: BTTAdditionalAction[];
  BTTTriggerParentUUID?: string;
}

export interface BTTGetTriggersResult {
  groups: {
    uuid: string;
    name: string;
    parentUUID?: string;
  }[];
  triggers: BTTTrigger[];
}
