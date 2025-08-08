export default async () => {
  console.log("get-current-time tool called");
  const now = new Date();
  const result = {
    currentTime: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    day: now.getDate(),
    dayOfWeek: now.getDay(), // 0 = Sunday, 1 = Monday, etc.
    hour: now.getHours(),
    minute: now.getMinutes(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  console.log("get-current-time tool returning:", result);
  return result;
};
