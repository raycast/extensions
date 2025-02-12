import { showHUD } from "@raycast/api";

/**
 * Measures the execution time of an async function and logs it
 * @param name Name of the operation being timed
 * @param fn Function to execute and time
 * @returns Result of the function execution
 */
export async function measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`⏱️ ${name} took ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name} failed after ${duration}ms:`, error);
    throw error;
  }
}

let notificationInterval: NodeJS.Timeout | null = null;

/**
 * Starts periodic notifications during a long-running process
 * @param message Base message to show
 * @param intervalMs Interval between notifications in milliseconds
 */
export function startPeriodicNotification(message: string, intervalMs: number = 1000) {
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }

  let count = 0;
  notificationInterval = setInterval(() => {
    count++;
    showHUD(`${message} ${".".repeat(count % 4)}`);
  }, intervalMs);
}

/**
 * Stops the periodic notifications
 */
export function stopPeriodicNotification() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}
