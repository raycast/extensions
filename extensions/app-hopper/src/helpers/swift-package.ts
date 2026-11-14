let executable: Promise<string> | undefined;

/** The Swift import makes ray build compile and package the native executable. */
export function getNativeExecutable(): Promise<string> {
  if (!executable) {
    executable = import("swift:../../swift/app-hopper-native")
      .then(({ helperExecutablePath }) => helperExecutablePath())
      .catch((error) => {
        executable = undefined;
        throw error;
      });
  }
  return executable;
}

export function nativeHelperArguments(helper: string, args: string[]): string[] {
  return ["runHelper", JSON.stringify(helper), JSON.stringify(args)];
}
