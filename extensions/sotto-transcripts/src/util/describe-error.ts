interface ErrorDescription {
  title: string;
  description: string;
}

export function describeLoadError(err: Error): ErrorDescription {
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    return {
      title: "Sotto history not found",
      description:
        "No recording-history.json at the expected path. Make sure Sotto is installed, or set a custom path in extension preferences.",
    };
  }
  if ((err as NodeJS.ErrnoException).code === "EACCES") {
    return {
      title: "Permission denied",
      description:
        "Raycast doesn't have access to the history file. Grant Full Disk Access to Raycast in System Settings.",
    };
  }
  if (err instanceof SyntaxError) {
    return {
      title: "History file is corrupted",
      description: `recording-history.json contains invalid JSON: ${err.message}`,
    };
  }
  return {
    title: "Couldn't read recording history",
    description: err.message,
  };
}
