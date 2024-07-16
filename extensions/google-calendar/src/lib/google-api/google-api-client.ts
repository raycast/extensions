import fetch from "node-fetch";

export abstract class GoogleApiClient {
  protected readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  protected async getFromGoogleRestApi<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    const parsedResponse = await response.json();
    return parsedResponse as T;
  }

  protected async postToGoogleRestApi<T>(url: string, body: T): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to POST to '${url}' (${response.statusText}): ${errorText}`);
    }
  }

  protected async deleteFromGoogleRestApi(url: string): Promise<void> {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to DELETE to '${url}' (${response.statusText}): ${errorText}`);
    }
  }
}
