// Test script to verify the recently_used sorting logic
const SortMethod = {
  USAGE: "usage",
  RECENTLY_USED: "recently_used",
};

// Mock data
const windows = [
  { id: 1, app: "Chrome", title: "Tab 1" },
  { id: 2, app: "VSCode", title: "File 1" },
  { id: 3, app: "Terminal", title: "Terminal" },
  { id: 4, app: "Finder", title: "Desktop" },
];

// Mock usage times - simulate window usage history
// Higher timestamp = more recent
const usageTimes = {
  1: 1000, // oldest
  2: 2000, // second oldest
  3: 4000, // most recent (current window)
  4: 3000, // second most recent (previous window)
};

// Simulate the sorting logic from the fixed code
function sortWindows(windows, usageTimes, sortMethod) {
  const windowsCopy = [...windows];
  
  if (sortMethod === SortMethod.RECENTLY_USED) {
    // Get the two most recently used windows (by timestamp)
    const recentlyUsedIds = Object.entries(usageTimes)
      .sort(([, timeA], [, timeB]) => timeB - timeA)
      .slice(0, 2)
      .map(([id]) => parseInt(id));

    console.log("Recently used IDs (most recent first):", recentlyUsedIds);
    
    // Find the corresponding windows
    const previousWindow = windowsCopy.find((w) => w.id === recentlyUsedIds[1]); // second most recent
    const currentWindow = windowsCopy.find((w) => w.id === recentlyUsedIds[0]);  // most recent

    console.log("Previous window (should be first):", previousWindow);
    console.log("Current window (should be second):", currentWindow);

    return windowsCopy.sort((a, b) => {
      // Previous window (second most recently used) comes first
      if (previousWindow && a.id === previousWindow.id) return -1;
      if (previousWindow && b.id === previousWindow.id) return 1;

      // Current window (most recently used) comes second
      if (currentWindow && a.id === currentWindow.id) return -1;
      if (currentWindow && b.id === currentWindow.id) return 1;

      // Rest in alphabetical order
      return a.app.localeCompare(b.app);
    });
  }
  
  return windowsCopy;
}

// Test the sorting
console.log("Original windows:", windows);
console.log("Usage times:", usageTimes);
console.log("\nSorting with RECENTLY_USED method:");

const sorted = sortWindows(windows, usageTimes, SortMethod.RECENTLY_USED);
console.log("\nSorted windows:");
sorted.forEach((win, index) => {
  console.log(`${index + 1}. ${win.app} (ID: ${win.id}) - Usage time: ${usageTimes[win.id]}`);
});

console.log("\nExpected order:");
console.log("1. Finder (ID: 4) - Previous window (second most recent)");
console.log("2. Terminal (ID: 3) - Current window (most recent)");
console.log("3. Chrome (ID: 1) - Alphabetical order");
console.log("4. VSCode (ID: 2) - Alphabetical order");