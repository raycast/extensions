import { PaginatedResult, Panel, Server, SSHKey } from "./types";

class VirtFusion {
  private panel: Panel;

  constructor(panel: Panel) {
    this.panel = panel;
  }
  protected async request<T>(endpoint: string, options?: RequestInit) {
    const response = await fetch(new URL(`api/${endpoint}`, this.panel.virtfusion_url), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.panel.api_token}`,
      },
      ...options,
    });
    if (!response.ok) throw new Error(response.statusText);
    if (response.status === 204) return undefined as T;
    if (response.headers.get("Content-Type")?.includes("text/html")) return undefined as T;
    const result = (await response.json()) as T;
    return result;
  }

  public async connect() {
    return this.request<void>("connect");
  }
  public async listServers(params: { page: number }) {
    return this.request<PaginatedResult<Server>>(`server?page=${params.page}`);
  }
  public async listAccountSSHKeys(params: { page: number }) {
    return this.request<PaginatedResult<SSHKey>>(`account/sshKeys?page=${params.page}`);
  }
  public async deleteAccountSSHKey(id: number) {
    return this.request(`account/sshKeys/${id}`, { method: "DELETE" });
  }
}

export default VirtFusion;
