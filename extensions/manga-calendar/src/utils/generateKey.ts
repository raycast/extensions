export function generateKey() {
  const timestamp = new Date().getTime(); // Get the current timestamp in milliseconds
  const random = Math.random().toString().slice(2); // Generate a random number between 0 and 1
  const uniqueId = `${timestamp}_${random}`; // Combine timestamp and random number
  return uniqueId;
}
