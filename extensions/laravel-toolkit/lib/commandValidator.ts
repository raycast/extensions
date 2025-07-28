interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

const INTERACTIVE_COMMANDS = [
  "tinker",
];

const LONG_RUNNING_COMMANDS = [
  "serve",
  "queue:work",
  "queue:listen", 
  "queue:restart",
  "schedule:work",
  "horizon",
  "websockets:serve",
];

const BROWSER_COMMANDS = [
  "dusk",
  "dusk:install",
  "dusk:chrome-driver",
  "dusk:fails",
];

const DESTRUCTIVE_COMMANDS = [
  "migrate:fresh",
  "migrate:reset", 
  "db:wipe",
  "queue:flush",
];

export function validateArtisanCommand(command: string): ValidationResult {
  const baseCommand = command.split(" ")[0].toLowerCase();
  
  // Check for interactive commands
  if (INTERACTIVE_COMMANDS.includes(baseCommand)) {
    return {
      isValid: false,
      reason: "Interactive commands like 'tinker' are not supported in this interface. Use your terminal for interactive sessions."
    };
  }
  
  // Check for long-running commands
  if (LONG_RUNNING_COMMANDS.includes(baseCommand)) {
    return {
      isValid: false,
      reason: "Long-running commands like servers and workers are not suitable for this interface. Use your terminal to run background processes."
    };
  }
  
  // Check for browser testing commands
  if (BROWSER_COMMANDS.some(cmd => baseCommand.startsWith(cmd))) {
    return {
      isValid: false,
      reason: "Browser testing commands require a display and are not supported. Use your terminal for Dusk tests."
    };
  }
  
  // Warn about destructive commands but allow them
  if (DESTRUCTIVE_COMMANDS.some(cmd => baseCommand.startsWith(cmd))) {
    return {
      isValid: true,
      reason: "⚠️ This is a destructive command that may delete data. Make sure you have backups!"
    };
  }
  
  return { isValid: true };
}