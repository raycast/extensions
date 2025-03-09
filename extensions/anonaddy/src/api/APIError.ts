import type { Response } from "node-fetch";

class APIError extends Error {
  constructor(response: Response) {
    super(`API Error: ${response.status}`);
  }
}

export default APIError;
