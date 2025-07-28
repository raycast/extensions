export default async () => {
  const now = new Date();
  return {
    currentTime: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
    day: now.getDate(),
    dayOfWeek: now.getDay(), // 0 = Sunday, 1 = Monday, etc.
    hour: now.getHours(),
    minute: now.getMinutes(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};
