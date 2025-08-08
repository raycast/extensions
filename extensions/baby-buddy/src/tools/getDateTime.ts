/**
 * Get the current date and time, useful if the user needs a relative time
 * for example, if they ask "create a timer starting 10 minutes ago", use this
 * tool to get the current time and subtract 10 minutes.
 */
export default function () {
  return new Date().toLocaleString();
}
