import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Course } from "../api/classroom";
import { getAccountEmail } from "../api/googleAuth";

// Courses often stay active long after they ended, so the user can leave them out of the assignments.
// Kept per account: course IDs mean nothing to another one.
const key = () => `hidden-courses:${getAccountEmail() ?? ""}`;

export async function getHiddenCourseIds(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(key());
  try {
    const ids: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function useHiddenCourses() {
  // Undefined until read, so that nothing is fetched for a course that turns out to be hidden
  const [hiddenIds, setHiddenIds] = useState<string[]>();
  useEffect(() => {
    getHiddenCourseIds().then(setHiddenIds);
  }, []);

  async function setHidden(course: Course, hidden: boolean, isUndo = false) {
    const others = (await getHiddenCourseIds()).filter((id) => id !== course.id);
    const ids = hidden ? [...others, course.id] : others;
    await LocalStorage.setItem(key(), JSON.stringify(ids));
    setHiddenIds(ids);
    await showToast({
      style: Toast.Style.Success,
      title: hidden ? "Hidden from Assignments" : "Shown in Assignments",
      message: course.name,
      primaryAction: isUndo ? undefined : { title: "Undo", onAction: () => setHidden(course, !hidden, true) },
    });
  }

  return { hiddenIds, setHidden };
}
