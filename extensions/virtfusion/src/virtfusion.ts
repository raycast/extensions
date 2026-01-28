import { Panel } from "./types";

class VirtFusion {
private panel: Panel;
  
constructor(panel: Panel) {
    this.panel = panel;
  }
  private async makeRequest<T>(endpoint: string, options?: RequestInit) {
    const response = await fetch(new URL(`api/${endpoint}`, this.panel.virtfusion_url), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.panel.api_token}`
        },
        ...options
    });
    if (!response.ok) throw new Error(response.statusText);
    const result = await response.json() as {data: T};
    return result.data;
  }

  public async getAccount() {
    return this.makeRequest<{
    "name": string
    "email": string
    "timezone": string
}>("account");
  }
}

export default VirtFusion;
