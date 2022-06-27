export interface ExecError extends Error {
  code: number;
  stdout: string;
  stderr: string;
}
