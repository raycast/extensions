export function formatCost(cost: number): string {
  if (cost <= 0) return "Free";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}
