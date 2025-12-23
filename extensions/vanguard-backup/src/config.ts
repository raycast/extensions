// list of times in a 24-hour day, divided into 15-minute intervals.
// 00:00, 00:15...23:30,23:45
export const BACKUP_TASK_TIMES = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
});
