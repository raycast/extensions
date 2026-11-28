export interface MonitorSla {
  availability: number;
  totalDowntime: number;
  numberOfIncidents: number;
  longestIncident: number;
  averageIncident: number;
}

export interface MonitorAvailabilityPeriod {
  label: string;
  sla: MonitorSla;
}
