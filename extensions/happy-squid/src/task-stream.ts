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
    const channel = client
      .channel(`${TASK_STREAM_TOPIC_PREFIX}${userId}`, { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_state", filter: `user_id=eq.${userId}` },
        ({ new: row }) => {
          if (mounted && "key" in row && ["recentTasks", "activeTask", "pausedTask"].includes(row.key))
            void onTaskChange();
        },
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
