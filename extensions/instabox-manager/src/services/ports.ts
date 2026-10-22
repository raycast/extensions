import { PublicPort, PublicPortList } from "../types";
import { machinePath, request } from "./instabox";

export function listPorts(machineId: string) {
  return request<PublicPortList>("GET", machinePath(machineId, "/ports"));
}

export function publishPort(machineId: string, port: number, name?: string) {
  return request<PublicPort>("POST", machinePath(machineId, "/ports"), { body: { port, name } });
}

export function unpublishPort(machineId: string, port: number) {
  return request<void>("DELETE", machinePath(machineId, `/ports/${port}`));
}
