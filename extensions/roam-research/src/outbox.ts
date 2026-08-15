import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { appendBlocks, CaptureError, processCapture } from "./roamApi";

const OUTBOX_KEY = "outbox-items";
const MAX_SYNCED_ITEMS = 100;
const MAX_TOTAL_ITEMS = 500;
const MAX_RETRIES = 10;

// --- Storage operations ---

export async function getOutboxItems(): Promise<OutboxItem[]> {
  const raw = await LocalStorage.getItem<string>(OUTBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Outbox data corrupted, backing up and resetting:", e);
    await LocalStorage.setItem("outbox-items-corrupted-backup", raw);
    return [];
  }
}

async function saveOutboxItems(items: OutboxItem[]): Promise<void> {
  await LocalStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function addOutboxItem(
  fields: Omit<OutboxItem, "id" | "createdAt" | "updatedAt" | "status" | "retryCount">
): Promise<OutboxItem> {
  const now = new Date().toISOString();
  const item: OutboxItem = {
    ...fields,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "pending",
    retryCount: 0,
  };
  const items = await getOutboxItems();
  items.unshift(item); // newest first
  await saveOutboxItems(items.slice(0, MAX_TOTAL_ITEMS));
  return item;
}

async function updateItemInPlace(
  id: string,
  update: Partial<Pick<OutboxItem, "status" | "errorMessage" | "isRetryable" | "retryCount" | "updatedAt">>
): Promise<void> {
  const items = await getOutboxItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  Object.assign(items[idx], update, { updatedAt: new Date().toISOString() });
  await saveOutboxItems(items);
}

export async function deleteOutboxItem(id: string): Promise<void> {
  const items = await getOutboxItems();
  await saveOutboxItems(items.filter((i) => i.id !== id));
}

export async function clearSyncedItems(): Promise<void> {
  const items = await getOutboxItems();
  await saveOutboxItems(items.filter((i) => i.status !== "synced"));
}

function pruneOldSyncedItems(items: OutboxItem[]): OutboxItem[] {
  let syncedCount = 0;
  return items.filter((item) => {
    if (item.status !== "synced") return true;
    syncedCount++;
    return syncedCount <= MAX_SYNCED_ITEMS;
  });
}

// --- Capture wrapper ---

export type CaptureParams = {
  graphName: string;
  token: string;
  content: string;
  template: string;
  tags: string[];
  page?: string;
  nestUnder?: string;
  templateName?: string;
};

export type CaptureResult = {
  success: boolean;
  item: OutboxItem;
  error?: Error;
};

export async function captureWithOutbox(params: CaptureParams): Promise<CaptureResult> {
  const { graphName, token, content, template, tags, page, nestUnder, templateName } = params;

  // Process at capture time — resolves {time}, {today}, {content}, {tags}, daily note page, etc.
  const processed = processCapture(content, template, tags, page, nestUnder);

  const item = await addOutboxItem({
    graphName,
    content,
    processedContent: processed.processedContent,
    pageTitle: processed.pageTitle,
    nestUnder: processed.nestUnder,
    tags: tags.length > 0 ? tags : undefined,
    templateName,
  });

  try {
    await appendBlocks(graphName, token, processed.pageTitle, processed.processedContent, processed.nestUnder);
    await updateItemInPlace(item.id, { status: "synced" });
    item.status = "synced";

    // Prune after successful capture
    const allItems = await getOutboxItems();
    const pruned = pruneOldSyncedItems(allItems);
    if (pruned.length !== allItems.length) {
      await saveOutboxItems(pruned);
    }

    return { success: true, item };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const isRetryable = e instanceof CaptureError ? e.isRetryable : false;
    const status: OutboxItemStatus = isRetryable ? "pending" : "failed";

    await updateItemInPlace(item.id, {
      status,
      errorMessage: error.message,
      isRetryable,
      // retryCount stays 0 — this was the initial attempt, not a retry
    });
    item.status = status;
    item.errorMessage = error.message;
    item.isRetryable = isRetryable;

    return { success: false, item, error };
  }
}

// --- Single-item retry (for manual retry in outbox view) ---

export async function retryOutboxItem(id: string, token: string): Promise<{ success: boolean; error?: Error }> {
  const items = await getOutboxItems();
  const item = items.find((i) => i.id === id);
  if (!item) return { success: false, error: new Error("Item not found") };

  try {
    await appendBlocks(item.graphName, token, item.pageTitle, item.processedContent, item.nestUnder);
    await updateItemInPlace(id, { status: "synced", errorMessage: undefined });
    return { success: true };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const isRetryable = e instanceof CaptureError ? e.isRetryable : false;
    const newStatus: OutboxItemStatus = isRetryable ? "pending" : "failed";
    // Don't increment retryCount — manual retries are user-initiated and shouldn't count against MAX_RETRIES
    await updateItemInPlace(id, { status: newStatus, errorMessage: error.message, isRetryable });
    return { success: false, error };
  }
}

// --- Queue processor (for background retry) ---

export type QueueResult = { synced: number; failed: number; stillPending: number };

export async function processOutboxQueue(graphsConfig: GraphsConfigMap): Promise<QueueResult> {
  const items = await getOutboxItems();
  const pending = items.filter((i) => i.status === "pending");
  if (pending.length === 0) return { synced: 0, failed: 0, stillPending: 0 };

  // Group by graph, oldest first within each group
  const byGraph = new Map<string, OutboxItem[]>();
  for (const item of [...pending].reverse()) {
    // reverse so oldest is first
    const group = byGraph.get(item.graphName) || [];
    group.push(item);
    byGraph.set(item.graphName, group);
  }

  let synced = 0;
  let failed = 0;

  for (const [graphName, graphItems] of byGraph) {
    const graphConfig = graphsConfig[graphName];
    if (!graphConfig) {
      // Graph removed — mark all as failed
      for (const item of graphItems) {
        await updateItemInPlace(item.id, {
          status: "failed",
          errorMessage: "Graph no longer configured",
          isRetryable: false,
        });
        failed++;
      }
      continue;
    }

    const token = graphConfig.tokenField;

    for (const item of graphItems) {
      if (item.retryCount >= MAX_RETRIES) {
        await updateItemInPlace(item.id, {
          status: "failed",
          errorMessage: `Max retries (${MAX_RETRIES}) exceeded. Last error: ${item.errorMessage || "unknown"}`,
          isRetryable: false,
        });
        failed++;
        continue;
      }

      try {
        await appendBlocks(graphName, token, item.pageTitle, item.processedContent, item.nestUnder);
        await updateItemInPlace(item.id, {
          status: "synced",
          errorMessage: undefined,
        });
        synced++;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        const isRetryable = e instanceof CaptureError ? e.isRetryable : false;
        const newStatus: OutboxItemStatus = isRetryable ? "pending" : "failed";

        await updateItemInPlace(item.id, {
          status: newStatus,
          errorMessage: error.message,
          isRetryable,
          retryCount: item.retryCount + 1,
        });

        if (isRetryable) {
          // Stop processing this graph — preserves FIFO order
          break;
        } else {
          failed++;
          // Permanent error — continue to next item
        }
      }
    }
  }

  // Prune and recount after processing
  const updatedItems = await getOutboxItems();
  const pruned = pruneOldSyncedItems(updatedItems);
  if (pruned.length !== updatedItems.length) {
    await saveOutboxItems(pruned);
  }
  const stillPending = pruned.filter((i) => i.status === "pending").length;

  return { synced, failed, stillPending };
}
