import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    await showFailureToast(error, {
      title: "Could not connect Google Classroom",
    });
  }
}
