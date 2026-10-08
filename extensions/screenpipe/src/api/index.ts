import fetch from "node-fetch";

interface PipeCron {
  path: string;
  schedule: string;
}

interface PipeConfig {
  crons: PipeCron[];
  is_nextjs: boolean;
  source: string;
}

export interface Pipe {
  config: PipeConfig;
  enabled: boolean;
  id: string;
  port: number | null;
  source: string;
}

interface PipeListResponse {
  data: Pipe[];
  success: boolean;
}

export class PipeApi {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3030") {
    this.baseUrl = baseUrl;
  }

  async listPipes(): Promise<Pipe[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pipes/list`);
      if (!response.ok) {
        throw new Error(`failed to fetch pipes: ${response.statusText}`);
      }
      const data = (await response.json()) as PipeListResponse;
      if (!data.success) {
        throw new Error("failed to list pipes: api returned success: false");
      }
      return data.data;
    } catch (error) {
      console.error("error listing pipes:", error);
      throw error;
    }
  }

  async enablePipe(pipeId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/pipes/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pipe_id: pipeId }),
      });
      if (!response.ok) {
        throw new Error(`failed to enable pipe: ${response.statusText}`);
      }
    } catch (error) {
      console.error("error enabling pipe:", error);
      throw error;
    }
  }

  async disablePipe(pipeId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/pipes/disable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pipe_id: pipeId }),
      });
      if (!response.ok) {
        throw new Error(`failed to disable pipe: ${response.statusText}`);
      }
    } catch (error) {
      console.error("error disabling pipe:", error);
      throw error;
    }
  }
}
