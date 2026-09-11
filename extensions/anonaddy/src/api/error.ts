class AddyError extends Error {
  public readonly status: number;

  constructor(response: Response) {
    super(`API Error: ${response.status}`);
    this.status = response.status;
  }
}

export default AddyError;
