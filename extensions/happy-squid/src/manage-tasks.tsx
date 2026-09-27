import { ActionPanel, Detail } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { completeHappySquidConnection, type ConnectionCallback } from "./handoff";
import { TaskProvider, useAccount, useTasks } from "./task-state";
import { taskSubtitle, markdownText, isTaskExpired } from "./format";
import { SignIn } from "./components/sign-in";
import { TaskList } from "./components/task-list";
import { TaskDetail } from "./components/task-detail";
import { TaskReviewFlow } from "./components/task-review-flow";
import { CommonActions } from "./components/common-actions";
import { updateTaskSubtitle } from "./task-subtitle";

type CancelReview = { reviewId: string; taskId: string | null };
export interface TaskPageContext {
  raycastConnection?: ConnectionCallback;
  cancelReview?: CancelReview;
}

/** Enter only opens the page. All task mutations belong to its actions/forms. */
export default function Tasks({ launchContext }: { launchContext?: TaskPageContext }) {
  const account = useAccount();
  const callback = launchContext?.raycastConnection;
  const [connecting, setConnecting] = useState(!!callback);
  useEffect(() => {
    if (!callback) return;
    let mounted = true;
    void completeHappySquidConnection(account.client, callback)
      .catch((error) => console.warn("[raycast-auth] complete", error))
      .finally(() => {
        if (mounted) setConnecting(false);
      });
    return () => {
      mounted = false;
    };
  }, [account.client, callback]);
  useEffect(() => {
    if (account.session === null) void updateTaskSubtitle("Sign in to Happy Squid");
  }, [account.session]);
  if (connecting || account.session === undefined)
    return <Detail navigationTitle="Happy Squid" isLoading markdown="" />;
  if (!account.session) return <SignIn client={account.client} initialError={account.error} />;
  return (
    <TaskProvider key={account.session.user.id} account={account}>
      <TaskPage cancelReview={launchContext?.cancelReview} />
    </TaskProvider>
  );
}

function TaskPage({ cancelReview }: { cancelReview?: CancelReview }) {
  const { snapshot, now, loading, error, perform, routeDepth } = useTasks();
  const cancelledReview = useRef<string | null>(null);
  const [cancellingReview, setCancellingReview] = useState<string | null>(null);
  useEffect(() => {
    if (
      !cancelReview ||
      cancelledReview.current === cancelReview.reviewId ||
      !snapshot ||
      snapshot.review?.id !== cancelReview.reviewId ||
      (snapshot.task?.id ?? null) !== cancelReview.taskId
    )
      return;
    cancelledReview.current = cancelReview.reviewId;
    setCancellingReview(cancelReview.reviewId);
    void perform({ kind: "review-cancel" }, snapshot).finally(() => setCancellingReview(null));
  }, [cancelReview, snapshot, perform]);
  const subtitle = taskSubtitle(snapshot, now);
  useEffect(() => {
    void updateTaskSubtitle(subtitle);
  }, [subtitle]);
  const cancelling =
    cancelReview &&
    snapshot?.review?.id === cancelReview.reviewId &&
    (snapshot.task?.id ?? null) === cancelReview.taskId &&
    (cancelledReview.current !== cancelReview.reviewId || cancellingReview === cancelReview.reviewId);
  if (cancelling && routeDepth === 0) return <Detail navigationTitle="Happy Squid" isLoading markdown="" />;
  if (!snapshot)
    return (
      <Detail
        navigationTitle="Happy Squid"
        isLoading={loading}
        markdown={error ? `# Connect to Happy Squid\n\n${markdownText(error)}` : ""}
        actions={
          <ActionPanel>
            <CommonActions />
          </ActionPanel>
        }
      />
    );
  if (snapshot.review) return <TaskReviewFlow key={JSON.stringify([snapshot.task?.id, snapshot.review.kind])} />;
  if (snapshot.task && !isTaskExpired(snapshot, now)) return <TaskDetail />;
  return <TaskList />;
}
