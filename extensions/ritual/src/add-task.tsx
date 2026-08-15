import {
  LaunchProps,
  Toast,
  closeMainWindow,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { addTask } from "./api/tasks";
import { TaskForm } from "./components/TaskForm";
import { quickCaptureDestination, resolveCli } from "./preferences";

/// A title typed straight into the argument never draws the form: type
/// `Add Task`, type the title, Enter, done. An empty argument opens the form.
export default function AddTask(
  props: LaunchProps<{ arguments: { title?: string } }>,
) {
  const quick = props.arguments?.title?.trim();
  const [failed, setFailed] = useState(false);
  // Guards against a second capture for the same launch. `quick` is a stable
  // primitive across re-renders (setFailed alone won't change it, so the
  // effect wouldn't re-run from that), but React 18 can invoke an effect
  // twice for one mount (Strict Mode's mount → cleanup → mount), and that
  // would fire `addTask` twice with no way to tell from the outside — so the
  // "already fired" guard is a ref, not just the dependency array.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!quick || firedRef.current) return;
    firedRef.current = true;
    (async () => {
      try {
        const destination = quickCaptureDestination();
        const note = await addTask(resolveCli(), {
          title: quick,
          when: destination,
        });
        await closeMainWindow();
        await popToRoot();
        await showHUD(
          note ? `Added to Ritual — ${note}` : `Added to Ritual: ${quick}`,
        );
      } catch (error) {
        // Fall back to the form with the title already filled in, rather than
        // dropping what was typed.
        setFailed(true);
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't add task",
          message: (error as Error).message,
        });
      }
    })();
  }, [quick]);

  if (quick && !failed) return null;
  return (
    <TaskForm
      mode="create"
      defaultWhen={quickCaptureDestination()}
      initialTitle={quick}
    />
  );
}
