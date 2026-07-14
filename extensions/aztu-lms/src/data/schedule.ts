import { authedFetch } from "@/lib/auth";

export type Schedule = {
  status: "success" | "error";
  data: Record<
    string,
    Array<{
      hour_id: number;
      time: string;
      room: string | null;
      subject: string;
      teacher: string;
      group: string;
      lecture_type: number;
      lecture_type_name: string;
      week_type: number;
      week_type_name: string;
    }>
  >;
};

export async function getSchedule() {
  const response = await authedFetch("schedule", { method: "GET" });

  const data = (await response.json()) as Schedule;

  if (data.status === "error") return null;

  return data;
}
