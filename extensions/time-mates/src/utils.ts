import { LocalStorage } from "@raycast/api";
import fs from "fs/promises";

export async function getTimemates() {
  const storedTimemates = (await LocalStorage.getItem("timemates")) as string;
  const timemates = storedTimemates ? JSON.parse(storedTimemates) : [];
  return timemates;
}

export async function deleteTimemate(id: string) {
  try {
    const storedTimemates = (await LocalStorage.getItem("timemates")) as string;
    const timemates = storedTimemates ? JSON.parse(storedTimemates) : [];
    const updatedTimemates = timemates.filter((timemate: { id: string }) => timemate.id !== id);
    await LocalStorage.setItem("timemates", JSON.stringify(updatedTimemates));
  } catch (error) {
    console.error("Error deleting timemate:", error);
    throw new Error("Failed to delete timemate");
  }
}

export async function updateTimemate(timemate: { id: string; name: string; country: string; avatar: string }) {
  try {
    const storedTimemates = (await LocalStorage.getItem("timemates")) as string;
    const timemates = storedTimemates ? JSON.parse(storedTimemates) : [];
    const updatedTimemates = timemates.map((t: { id: string }) => (t.id === timemate.id ? timemate : t));
    await LocalStorage.setItem("timemates", JSON.stringify(updatedTimemates));
  } catch (error) {
    console.error("Error updating timemate:", error);
    throw new Error("Failed to update timemate");
  }
}

export async function imageToBase64(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return "data:image/png;base64," + fileBuffer.toString("base64");
  } catch (error) {
    console.error("Error converting file to Base64:", error);
    throw new Error("Failed to convert file to Base64");
  }
}
