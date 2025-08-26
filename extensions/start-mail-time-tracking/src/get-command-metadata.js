import { LocalStorage } from "@raycast/api";

export default async function () {
  try {
    const lastEmailSubject = await LocalStorage.getItem("lastEmailSubject");
    return {
      subtitle: lastEmailSubject || "Ready to track email time",
    };
  } catch (error) {
    console.error("Error getting last email subject:", error);
    return { subtitle: "Email time tracking" };
  }
}
