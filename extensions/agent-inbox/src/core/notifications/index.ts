import { Store } from "../db";
import { Config, Session } from "../types";
import { macosChannel } from "./macos";
import { NotificationChannel, notificationMessage } from "./types";

export type { NotificationChannel, NotificationMessage } from "./types";

export function enabledChannels(config: Config): string[] {
  return config.notifications ? [...new Set(config.notificationChannels ?? ["macos"])] : [];
}

/** Other channels (Feishu, webhooks, etc.) are injected here, independently of agent sources. */
export async function deliverNotifications(
  store: Store,
  config: Config,
  channels: NotificationChannel[] = [macosChannel()],
  now?: number,
): Promise<void> {
  const registry = new Map(channels.map((channel) => [channel.id, channel]));
  const enabled = enabledChannels(config);
  for (let count = 0; count < 20; count++) {
    const [job] = await store.claimNotifications(now ?? Date.now());
    if (!job) break;
    const session = JSON.parse(job.payload) as Session;
    const current = await store.get(session.agent, session.sessionId);
    if (
      !enabled.includes(job.channel) ||
      !current?.subscribed ||
      current.handledAt !== null ||
      current.status !== "needs_input" ||
      !sameAttention(session, current)
    ) {
      await store.finishNotification(job, true, now ?? Date.now());
      continue;
    }
    const channel = registry.get(job.channel);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!channel) throw new Error(`Unknown notification channel: ${job.channel}`);
      await Promise.race([
        channel.send(notificationMessage(job.id, { ...session, title: current.title }), {
          config,
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("Notification timed out"));
          }, 10000);
        }),
      ]);
      await store.finishNotification(job, true, now ?? Date.now());
    } catch {
      await store.finishNotification(job, false, now ?? Date.now());
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function sameAttention(queued: Session, current: Session): boolean {
  const requests = queued.state?.pending ?? [];
  return requests.length
    ? requests.some((request) => current.state?.pending.some((p) => p.id === request.id && p.at === request.at))
    : queued.attention === current.attention;
}
