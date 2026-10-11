// Stands in for Raycast's `swift:` imports under Vitest; the real functions run only inside Raycast.
const unavailable = () => Promise.reject(new Error("Swift functions only run inside Raycast"));

export const syncPrayerReminders = unavailable;
export const movePrayerReminders = unavailable;
export const getPrayerStatuses = unavailable;
export const setPrayerCompleted = unavailable;
