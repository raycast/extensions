import { showToast, Toast } from "@raycast/api";
import { mondayConfig } from "@monday/config";
import { mondayFetch } from "@monday/client";

interface TimeEntry {
  date: string; // YYYY-MM-DD
  hours: number;
  notes?: string;
}

interface CreateItemPayload {
  create_item: {
    id: string;
  };
}

interface MePayload {
  me: {
    id: string;
    name: string;
  };
}

/**
 * Gets the current user's ID from Monday.com.
 * @returns The current user's ID or null if not available.
 */
async function getCurrentUserId(): Promise<string | null> {
  if (!mondayConfig.enabled) {
    return null;
  }

  const query = `
    query {
      me {
        id
        name
      }
    }
  `;

  try {
    const jsonResponse = await mondayFetch<MePayload>(query);
    return jsonResponse.data?.me?.id || null;
  } catch (error) {
    console.error("Failed to get current user ID:", error);
    return null;
  }
}

/**
 * Logs a time entry to Monday.com by creating a new item.
 * @param entry The time entry details.
 * @param projectName The name of the project, used as the item name.
 */
export async function logTimeToMonday(entry: TimeEntry, projectName: string, overrideGroupId?: string) {
  if (!mondayConfig.enabled) {
    return;
  }

  const { boardId, groupId: defaultGroup, columns } = mondayConfig;
  const groupId = overrideGroupId || defaultGroup;

  if (!boardId || !groupId) {
    console.warn("Monday.com configuration is incomplete. Skipping API call.", {
      boardId,
      groupId,
    });
    return;
  }

  // Get the current user's ID to assign to the item
  const currentUserId = await getCurrentUserId();

  const query = `
    mutation create_item($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON!) {
      create_item (
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
      }
    }
  `;

  const columnValues: {
    [key: string]: string | number | { date: string } | { personsAndTeams: { id: number; kind: "person" }[] };
  } = {};
  if (columns.date) {
    columnValues[columns.date] = { date: entry.date };
  }
  if (columns.hours) {
    columnValues[columns.hours] = entry.hours;
  }
  if (columns.notes && entry.notes) {
    columnValues[columns.notes] = entry.notes;
  }
  if (columns.person && currentUserId) {
    columnValues[columns.person] = { personsAndTeams: [{ id: Number(currentUserId), kind: "person" }] };
  }

  const variables = {
    boardId: boardId,
    groupId: groupId,
    itemName: `${projectName}: ${entry.hours} timmar`,
    columnValues: JSON.stringify(columnValues),
  };

  try {
    const jsonResponse = await mondayFetch<CreateItemPayload>(query, variables);

    if (jsonResponse.data?.create_item?.id) {
      const assignedMessage = currentUserId ? " and assigned to you" : "";
      await showToast(Toast.Style.Success, "Logged to Monday.com", `New item created on your board${assignedMessage}.`);
    } else {
      await showToast(Toast.Style.Failure, "Monday API Error", "Could not log time to Monday.com.");
      console.error("Monday.com API Error:", jsonResponse.errors);
    }
  } catch (error) {
    console.error("Failed to call Monday.com API:", error);
    await showToast(Toast.Style.Failure, "Monday API Call Failed", "Check your connection and configuration.");
  }
}
