/**
 * Raises an error.
 *
 * @param - The error to be raised. Can be either an Error object or a string.
 *
 * @returns - The function does not return a value.
 */
function raise(err?: Error | string): never {
  if (err instanceof Error) {
    throw err;
  }

  if (typeof err === "string") {
    throw new Error(err);
  }

  throw new Error();
}

export { raise };
