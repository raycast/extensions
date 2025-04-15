// Removed fs import as it's no longer needed

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};
// Removed appInstalled function as it's no longer needed
};
