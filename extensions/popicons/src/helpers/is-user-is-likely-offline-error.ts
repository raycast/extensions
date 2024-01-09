function isUserIsLikelyOfflineError(err: unknown) {
  if (err instanceof Error && "code" in err && err.code === "ENOTFOUND") {
    return true;
  }

  return false;
}

export { isUserIsLikelyOfflineError };
