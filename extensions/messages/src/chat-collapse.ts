export type CollapsibleChatRow = {
  chat_identifier: string;
  is_group: boolean | number;
  chat_row_id?: number | string | null;
  contactId?: string | null;
  display_name?: string | null;
  group_name?: string | null;
  searchableText?: string | null;
  group_id?: string | null;
  original_group_id?: string | null;
  last_message_timestamp?: number | string | null;
  last_message_date?: string | null;
};

class UnionFind {
  private readonly parents = new Map<string, string>();

  add(value: string) {
    if (!this.parents.has(value)) {
      this.parents.set(value, value);
    }
  }

  find(value: string): string {
    this.add(value);

    const parent = this.parents.get(value);
    if (!parent || parent === value) {
      return value;
    }

    const root = this.find(parent);
    this.parents.set(value, root);
    return root;
  }

  union(left: string, right: string) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);

    if (leftRoot !== rightRoot) {
      this.parents.set(rightRoot, leftRoot);
    }
  }
}

function cleanIdentifier(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function isGroupChat(row: CollapsibleChatRow): boolean {
  return row.is_group === true || row.is_group === 1;
}

function rowTimestamp(row: CollapsibleChatRow): number {
  const timestamp = Number(row.last_message_timestamp);
  if (Number.isFinite(timestamp)) {
    return timestamp;
  }

  const parsedDate = Date.parse(row.last_message_date ?? "");
  return Number.isFinite(parsedDate) ? parsedDate : 0;
}

function rowTieBreaker(row: CollapsibleChatRow): number {
  const rowID = Number(row.chat_row_id);
  return Number.isFinite(rowID) ? rowID : 0;
}

function newestFirst(left: CollapsibleChatRow, right: CollapsibleChatRow): number {
  const timestampDiff = rowTimestamp(right) - rowTimestamp(left);
  if (timestampDiff !== 0) {
    return timestampDiff;
  }

  return rowTieBreaker(right) - rowTieBreaker(left);
}

function newestRow<T extends CollapsibleChatRow>(rows: T[]): T {
  return [...rows].sort(newestFirst)[0];
}

function newestDisplayName(rows: CollapsibleChatRow[]): string | undefined {
  return [...rows]
    .sort(newestFirst)
    .map((row) => cleanIdentifier(row.display_name))
    .find(Boolean);
}

function mergedSearchableText(rows: CollapsibleChatRow[]): string | undefined {
  const searchableTerms = rows.flatMap((row) => [
    cleanIdentifier(row.searchableText),
    cleanIdentifier(row.chat_identifier),
  ]);
  const uniqueTerms = [...new Set(searchableTerms.filter((term): term is string => Boolean(term)))];

  return uniqueTerms.length > 0 ? uniqueTerms.join(" ") : undefined;
}

function groupLineageID(row: CollapsibleChatRow, unionFind: UnionFind): string | undefined {
  const groupID = cleanIdentifier(row.group_id);
  const originalGroupID = cleanIdentifier(row.original_group_id);
  const lineageID = groupID || originalGroupID;

  return lineageID ? unionFind.find(lineageID) : undefined;
}

function chatGroupKey(row: CollapsibleChatRow, unionFind: UnionFind): string {
  if (!isGroupChat(row)) {
    const contactID = cleanIdentifier(row.contactId);
    if (contactID) {
      return `direct-contact:${contactID}`;
    }

    return `direct:${row.chat_identifier}`;
  }

  const lineageID = groupLineageID(row, unionFind);
  return lineageID ? `group-lineage:${lineageID}` : `group-chat:${row.chat_identifier}`;
}

function mergeComponent<T extends CollapsibleChatRow>(rows: T[]): T {
  const representative = newestRow(rows);

  if (!isGroupChat(representative)) {
    const searchableText = mergedSearchableText(rows);
    return searchableText ? { ...representative, searchableText } : representative;
  }

  const displayName = newestDisplayName(rows);
  return {
    ...representative,
    display_name: displayName ?? null,
    group_name: displayName ?? null,
  };
}

export function collapseChatRows<T extends CollapsibleChatRow>(rows: readonly T[]): T[] {
  const unionFind = new UnionFind();

  rows.forEach((row) => {
    if (!isGroupChat(row)) {
      return;
    }

    const groupID = cleanIdentifier(row.group_id);
    const originalGroupID = cleanIdentifier(row.original_group_id);

    if (groupID) {
      unionFind.add(groupID);
    }

    if (originalGroupID) {
      unionFind.add(originalGroupID);
    }

    if (groupID && originalGroupID) {
      unionFind.union(groupID, originalGroupID);
    }
  });

  const components = new Map<string, T[]>();

  rows.forEach((row) => {
    const key = chatGroupKey(row, unionFind);
    const component = components.get(key);

    if (component) {
      component.push(row);
    } else {
      components.set(key, [row]);
    }
  });

  return [...components.values()].map(mergeComponent).sort(newestFirst);
}
