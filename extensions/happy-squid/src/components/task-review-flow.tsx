import { useEffect, useRef, useState } from "react";
import { useTaskNavigation, useTasks } from "../task-state";
import { TaskForm } from "./task-form";
import { TaskReview } from "./task-review";

/** The editor is the review's native parent, so Back always returns to it. */
export function TaskReviewFlow() {
  const { snapshot, busy, routeDepth } = useTasks();
  const push = useTaskNavigation();
  const current = useRef(snapshot);
  current.current = snapshot;
  const opened = useRef(false);
  const [editor, setEditor] = useState({ snapshot, version: 0 });
  const openChat = () => {
    if (!current.current?.review) return;
    push(<TaskReview />, () => {
      setEditor((previous) => ({ snapshot: current.current, version: previous.version + 1 }));
    });
  };
  useEffect(() => {
    if (opened.current || busy || routeDepth || !snapshot?.review || snapshot.review.status === "checking") return;
    opened.current = true;
    openChat();
  });
  const displayed = editor.snapshot ?? snapshot;
  if (!displayed?.review) return null;
  return (
    <TaskForm
      revision={editor.version}
      purpose={displayed.review.kind === "start" ? "start" : "review-edit"}
      displayed={displayed}
      description={displayed.review.description}
      durationMinutes={displayed.review.durationMinutes}
      onSaved={openChat}
    />
  );
}
