// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getErrorMessage(error: any) {
  if (error?.response?.errors) {
    return error.response.errors[0].message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
