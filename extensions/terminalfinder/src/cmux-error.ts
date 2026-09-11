export function formatCmuxError(message: string) {
  if (message.includes("Access denied")) {
    return "cmux denied external control. In cmux, open Settings -> Automation and set Socket Mode to Allow all local processes or Password.";
  }

  if (message.includes("Broken pipe") || message.includes("Failed to write to socket")) {
    return "Unable to reach cmux over its automation socket. Make sure cmux is running, then reopen Settings -> Automation and check Socket Mode.";
  }

  return message || "cmux command failed";
}
