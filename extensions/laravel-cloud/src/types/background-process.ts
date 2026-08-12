export interface BackgroundProcess {
  id: string;
  type: "background_processes";
  attributes: {
    type: string;
    processes: number;
    command: string | null;
    config: Record<string, unknown> | null;
    strategy_type: string | null;
    strategy_threshold: number | null;
    created_at: string | null;
  };
  relationships?: {
    instance?: { data: { id: string; type: string } | null };
  };
}
