// colors are inspired from the Proton Authenticator app
export function getProgressColor(remainingTime: number): { color: string; backgroundColor: string } {
  if (remainingTime >= 10) return { color: "#a779ff", backgroundColor: "#e4d7ff" };
  if (remainingTime > 5) return { color: "#ffb879", backgroundColor: "#ffe8d6" };
  return { color: "#ff7979", backgroundColor: "#ffd6d6" };
}
