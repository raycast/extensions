import { z } from "zod";
import { autoReadMergedPr, ghCommandPath } from "./preference";
import { Configuration } from "./configurations";
import { minimatch } from "minimatch";
import { execAsync } from "./util";

const NotificationSchema = z.object({
  id: z.preprocess((item) => `${item}`, z.string()),
  updated_at: z.preprocess((item) => new Date(`${item}`), z.date()),
  unread: z.preprocess((item) => item, z.boolean()),
  reason: z.string(),
  subject: z.object({
    title: z.string(),
    url: z.string().nullable(),
    latest_comment_url: z.string().nullable(),
    type: z.string(),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
  url: z.string(),
});

const NotificationArraySchema = z.array(NotificationSchema);

export type Notification = z.infer<typeof NotificationSchema>;

export const fetchNotifications = async (c: Configuration[]): Promise<Notification[]> => {
  const res = await execAsync(`${ghCommandPath} api notifications --jq '.'`);
  const n = NotificationArraySchema.parse(JSON.parse(res.stdout));
  return await filter(n, c);
};

export const filter = async (n: Notification[], c: Configuration[]): Promise<Notification[]> => {
  // extract read target from configuration
  const readList = n
    .map((n) => {
      const index = c.findIndex((f) => isRuleMatched(f, n));
      return index === -1 ? undefined : n;
    })
    .filter((f): f is Notification => f !== undefined);

  // extract read target from AutoClose
  const mergedPrAutoReadList = await extractMergedPrAutoReadList(n);
  console.log(`[autoReadMergedPr]${mergedPrAutoReadList.length}`);
  console.log(`[autoReadConfig]${readList.length}`);
  const target = readList.concat(mergedPrAutoReadList);
  const tasks = target.map((t) => markAsRead(t));
  await Promise.all(tasks);
  // // remove mark target notification
  const filteredNotification =
    autoReadMergedPr === true ? n.filter((f) => !target.map((r) => r.id).includes(f.id)) : [];
  return filteredNotification;
};

const extractMergedPrAutoReadList = async (n: Notification[]): Promise<Notification[]> => {
  const prList = n.filter((n) => n.subject.type === "PullRequest");
  const tasks = prList.map((p) =>
    execAsync(`${ghCommandPath} api ${p.subject.url} --jq '.state'`).then(async (s) =>
      s.stdout === "closed" ? p : undefined,
    ),
  );
  const result = await Promise.all(tasks);
  return result.filter((r): r is Notification => r !== undefined);
};

export const isRuleMatched = (c: Configuration, n: Notification) => {
  // reason
  const reason = c.reason.some((r) => minimatch(n.reason, r));
  // repository
  const repository = minimatch(n.repository.full_name, c.repository);
  // title
  const title = minimatch(n.subject.title, c.title);
  return reason && repository && title;
};
// mark as done/read
const markAsRead = async (n: Notification) => {
  console.log("markAsRead");
  await execAsync(`${ghCommandPath} api --method PATCH /notifications/threads/${n.id}`);
};
