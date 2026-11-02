import { CreateMachineRequest, Machine, MachineList, MachineMetric, Operation, UpdateMachineRequest } from "../types";
import { machinePath, request } from "./instabox";

export async function listMachines(): Promise<Machine[]> {
  const machines: Machine[] = [];
  let cursor: string | undefined;
  do {
    const page = await request<MachineList>("GET", "/v1/machines", { query: { limit: 100, cursor } });
    machines.push(...page.machines);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return machines;
}

export function getMachine(id: string) {
  return request<Machine>("GET", machinePath(id));
}

export function createMachine(body: CreateMachineRequest) {
  return request<Operation>("POST", "/v1/machines", { body, idempotent: true });
}

export function updateMachine(id: string, body: UpdateMachineRequest) {
  return request<Machine>("PATCH", machinePath(id), { body, idempotent: true });
}

export function deleteMachine(id: string) {
  return request<Operation>("DELETE", machinePath(id), { idempotent: true });
}

export async function getMachineMetrics(id: string) {
  const { metrics } = await request<{ metrics: MachineMetric[] }>("GET", machinePath(id, "/metrics"));
  return metrics;
}
