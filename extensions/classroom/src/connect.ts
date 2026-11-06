import { showHUD, showToast, Toast } from "@raycast/api";
import { ClassroomApi } from "./lib/api";
import { reconnect } from "./lib/auth";

export default async function Connect() {
  try {
    const api = new ClassroomApi(await reconnect());
    const courses = await api.courses();
    await showHUD(
      `Google Classroom connected · ${courses.length} active courses · coursework permission granted`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not connect Google Classroom",
      message: error instanceof Error ? error.message : "Sign-in failed.",
    });
  }
}
