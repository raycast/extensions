import { authedFetch } from "@/lib/auth";

export type Lecture = {
  id: string;
  class_num: string;
  lecture_name: string;
};

export async function getLectures() {
  try {
    const res = await authedFetch("lectures", {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch lectures");
    }
    const data = (await res.json()) as Lecture[];
    if (!Array.isArray(data)) return null;

    return data;
  } catch (error) {
    console.error("Error fetching lectures:", error);
    return null;
  }
}
