export interface Command {
  id: string;
  type: "commands";
  attributes: {
    command: string;
    status: CommandStatus;
    output: string | null;
    exit_code: number | null;
    failure_reason: string | null;
    started_at: string | null;
    finished_at: string | null;
    created_at: string | null;
  };
  relationships?: {
    environment?: { data: { id: string; type: string } | null };
    deployment?: { data: { id: string; type: string } | null };
    initiator?: { data: { id: string; type: string } | null };
  };
}

export type CommandStatus = "pending" | "command.created" | "command.running" | "command.failure" | "command.success";
