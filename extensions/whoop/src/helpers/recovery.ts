import { WhoopColor } from "./constants";

export function getRecoveryColor(recoveryScore: number) {
  if (recoveryScore >= 67) return WhoopColor.highRecovery;
  else if (recoveryScore >= 34) return WhoopColor.mediumRecovery;
  else return WhoopColor.lowRecovery;
}

export function getRecoveryEmoji(recovery?: number) {
  const recoveryScore = recovery || 0;
  if (recoveryScore >= 67) {
    return "🟢";
  } else if (recoveryScore >= 34) {
    return "🟡";
  } else {
    return "🔴";
  }
}
