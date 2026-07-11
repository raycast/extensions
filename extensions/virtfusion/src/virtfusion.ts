import { PaginatedResult, Panel, Server, SSHKey, Task } from "./types";

class VirtFusion {
  private panel: Panel;

  constructor(panel: Panel) {
    this.panel = panel;
  }
  protected async request<T>(endpoint: string, options?: RequestInit) {
    const base = this.panel.virtfusion_url.endsWith("/") ? this.panel.virtfusion_url : `${this.panel.virtfusion_url}/`;
    const response = await fetch(new URL(`api/${endpoint}`, base), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.panel.api_token}`,
      },
      ...options,
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { errors: string[] } | null;
      throw new Error(result?.errors[0] || response.statusText);
    }
    if (response.headers.get("Content-Type")?.includes("text/html") || response.status === 204) return undefined as T;
    const result = (await response.json()) as T;
    return result;
  }

  public async connect() {
    return this.request<void>("connect");
  }
  public async setBootOrder(params: { serverId: string }, payload: { order: string }) {
    return this.request<{
      data: {
        task: {
          id: number;
          status: string;
        };
      };
    }>(`server/${params.serverId}/bootOrder`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  public async listServers(params: { page: number }) {
    return this.request<PaginatedResult<Server>>(`server?page=${params.page}`);
  }
  public async listServerTasks(params: { serverId: string; page: number }) {
    return this.request<PaginatedResult<Task>>(`server/${params.serverId}/tasks/?page=${params.page}`);
  }
  public async listAccountSSHKeys(params: { page: number }) {
    return this.request<PaginatedResult<SSHKey>>(`account/sshKeys?page=${params.page}`);
  }
  public async deleteAccountSSHKey(id: number) {
    return this.request(`account/sshKeys/${id}`, { method: "DELETE" });
  }
}

export default VirtFusion;
