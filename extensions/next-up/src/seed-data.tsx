import { showHUD, LocalStorage } from "@raycast/api";
import { AppData } from "./lib/types";
import { STORAGE_KEY } from "./lib/constants";
import { getTodayName } from "./lib/schedule-utils";

const SEED: AppData = {
  activeGroupId: "group-1",
  groups: [
    {
      id: "group-1",
      name: "AY 2025-2026 Sem 2",
      createdAt: new Date().toISOString(),
      archived: false,
      courses: [
        {
          id: "c-1",
          title: "Introduction to Computer Science",
          courseCode: "CS101",
          color: "blue",
          icon: "code",
          units: 3,
          classLink: "https://university.edu/cs101",
          schedules: [
            {
              id: "s-1",
              days: ["Monday", "Wednesday", "Friday"],
              startTime: "09:00",
              endTime: "10:00",
              room: "Room 204",
              meetingLink: "https://zoom.us/j/123456",
            },
          ],
          professor: { name: "Dr. Jane Smith", email: "jsmith@university.edu" },
        },
        {
          id: "c-2",
          title: "Calculus II",
          courseCode: "MATH102",
          color: "green",
          icon: "book",
          units: 4,
          schedules: [
            {
              id: "s-2",
              days: ["Tuesday", "Thursday"],
              startTime: "10:30",
              endTime: "12:00",
              room: "Hall A",
            },
          ],
          professor: { name: "Prof. Alan Turing" },
        },
        {
          id: "c-3",
          title: "Study Group (Ephemeral)",
          ephemeral: true,
          expiresAt: new Date().toISOString().split("T")[0],
          schedules: [
            {
              id: "s-3",
              days: [getTodayName()],
              startTime: "14:00",
              endTime: "16:00",
              room: "Library",
            },
          ],
        },
      ],
    },
  ],
};

export default async function SeedData() {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
  await showHUD("✅ Seed data loaded!");
}
