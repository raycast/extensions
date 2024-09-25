import axios from "axios";

export class HakunaTimer {
  private apiToken: string;
  private baseUrl: string = "https://app.hakuna.ch/api/v1";

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async startTimer(taskId: string, projectId: string) {
    const headers = {
      "X-Auth-Token": `${this.apiToken}`,
      "Content-Type": "application/json",
    };
    const payload = { task_id: taskId, project_id: projectId };
    const response = await axios.post(`${this.baseUrl}/timer`, payload, {
      headers,
    });
    return response.data;
  }

  async stopTimer() {
    const headers = { "X-Auth-Token": `${this.apiToken}` };
    const response = await axios.put(`${this.baseUrl}/timer`, {}, { headers });
    return response.data;
  }
}
