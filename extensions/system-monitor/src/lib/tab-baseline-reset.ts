import { resetPerCoreCpuBaseline } from "./cpu-stats";

export function resetCpuTabBaselines(): void {
  resetPerCoreCpuBaseline();
}
