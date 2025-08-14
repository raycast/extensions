export class UnsupportedShellError extends Error {
  constructor(shell: string) {
    super(`Unsupported shell ${shell}`);
  }
}
