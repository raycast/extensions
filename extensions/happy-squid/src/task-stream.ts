import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskSnapshot } from "./vendor/task-control";
import { parseTaskStreamProgress, TASK_STREAM_EVENT, TASK_STREAM_TOPIC_PREFIX } from "./vendor/task-stream";

const BUFFERED_REVIEWS = 4;

export function useTaskStream(
  client: SupabaseClient,
  userId: string | undefined,
  review: TaskSnapshot["review"],
  onTaskChange: () => Promise<void>,
) {
  const [progress, setProgress] = useState(new Map<string, { sequence: number; text: string }>());
  useEffect(() => {
    setProgress(new Map());
    if (!userId) return;
    let mounted = true;
    // The account's head row moves with every synced write and names the
    // collections it touched.
    const taskChanged = ({ new: row }: { new: Record<string, unknown> }) => {
      const touched = Array.isArray(row.collections) ? (row.collections as string[]) : [];
      if (mounted && touched.some((collection) => ["recentTasks", "task"].includes(collection))) void onTaskChange();
    };
    const channel = client
      .channel(`${TASK_STREAM_TOPIC_PREFIX}${userId}`, { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sync_heads", filter: `user_id=eq.${userId}` },
        taskChanged,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sync_heads", filter: `user_id=eq.${userId}` },
        taskChanged,
      )
      .on("broadcast", { event: TASK_STREAM_EVENT }, ({ payload }) => {
        const next = parseTaskStreamProgress(payload);
        if (!mounted || !next) return;
        setProgress((previous) => {
          if ((previous.get(next.reviewId)?.sequence ?? 0) >= next.sequence) return previous;
          const updated = new Map(previous);
          updated.delete(next.reviewId);
          updated.set(next.reviewId, next);
          if (updated.size > BUFFERED_REVIEWS) updated.delete(updated.keys().next().value!);
          return updated;
        });
      })
      .subscribe((status) => {
        if (mounted && status === "SUBSCRIBED") void onTaskChange();
      });
    return () => {
      mounted = false;
      void client.removeChannel(channel);
    };
  }, [client, userId, onTaskChange]);
  return review?.status === "checking" ? (progress.get(review.id)?.text ?? "") : "";
}
