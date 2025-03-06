class APIError extends Error {
  constructor(status: number) {
    super(`API Error: ${status}`);
  }
}

export default APIError;
