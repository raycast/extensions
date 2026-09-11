import { Course, ScheduleSlot, DayOfWeek } from "./types";
import { parseTime } from "./schedule-utils";

export interface ConflictInfo {
  existingCourseTitle: string;
  day: DayOfWeek;
  time: string;
}

/**
 * Returns conflicts between `newSlots` and the existing courses in the group.
 * Pass `excludeCourseId` when editing an existing course so we don't flag it
 * as conflicting with itself.
 */
export function detectConflicts(
  newSlots: Pick<ScheduleSlot, "days" | "startTime" | "endTime">[],
  existingCourses: Course[],
  excludeCourseId?: string,
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  for (const slot of newSlots) {
    const slotStart = parseTime(slot.startTime);
    const slotEnd = parseTime(slot.endTime);

    for (const course of existingCourses) {
      if (course.id === excludeCourseId) continue;

      for (const existingSlot of course.schedules) {
        for (const day of slot.days) {
          if (!existingSlot.days.includes(day)) continue;

          const existStart = parseTime(existingSlot.startTime);
          const existEnd = parseTime(existingSlot.endTime);

          // Overlap: one starts before the other ends
          if (slotStart < existEnd && slotEnd > existStart) {
            conflicts.push({
              existingCourseTitle: course.title,
              day,
              time: `${slot.startTime}–${slot.endTime}`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}
