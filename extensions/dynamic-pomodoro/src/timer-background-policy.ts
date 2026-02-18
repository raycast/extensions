type ShouldArmWatchdogInput = {
  isReady: boolean;
  wasRunning: boolean;
  isRunning: boolean;
};

export function shouldArmWatchdog({ isReady, wasRunning, isRunning }: ShouldArmWatchdogInput): boolean {
  return isReady && !wasRunning && isRunning;
}
