function removeDuplicates<T>(array: T[], key: keyof T) {
  const seen = new Set<T[keyof T]>();

  return array.filter((value) => {
    const id = value[key];
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default removeDuplicates;
