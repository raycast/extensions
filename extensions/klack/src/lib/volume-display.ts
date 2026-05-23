export function labelFor(value: number): string {
  if (value === 0) return "Muted";
  if (value === 30) return "Soft";
  if (value === 60) return "Balanced";
  if (value === 90) return "Loud";
  if (value === 100) return "Maximum";
  return "";
}

export function tintForVolume(value: number): string {
  if (value === 0) return "#737373";
  if (value < 40) return "#10B981";
  if (value < 70) return "#2563EB";
  return "#F43F5E";
}
