interface MacTimerConfig {
  timerFile: string;
  timerName: string;
  seconds: number;
  soundPath: string;
  speak: boolean;
  volume: number;
  ringContinuously: boolean;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

// Quote both languages: AppleScript receives one literal script argument through the shell.
export function buildMacTimerCommand(config: MacTimerConfig) {
  const file = shellQuote(config.timerFile);
  const notification = `display notification ${JSON.stringify(`Timer "${config.timerName}" complete`)} with title "Ding!"`;
  const alert = config.speak
    ? `say -- ${shellQuote(config.timerName)}`
    : `afplay ${shellQuote(config.soundPath)} --volume ${config.volume}`;
  const parts = [`sleep ${config.seconds}`, `if [ -f ${file} ]; then osascript -e ${shellQuote(notification)}`, alert];
  if (config.ringContinuously) {
    parts.push(`while [ -f ${shellQuote(config.timerFile.replace(".timer", ".dismiss"))} ]; do ${alert}; done`);
  }
  parts.push(`rm ${file}; else echo "Timer deleted"; fi`);
  return parts.join(" ; ");
}
