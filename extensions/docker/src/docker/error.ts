export interface ErrorECONNREFUSED extends Error {
  errno: -61;
  code: 'ECONNREFUSED';
  syscall: string;
  address: string;
}

export const isConnrefusedError = (error: Error & { errno?: number; code?: string }): error is ErrorECONNREFUSED => {
  return error.errno === -61 && error.code === 'ECONNREFUSED';
};
