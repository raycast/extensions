export function isProbationEndInFuture(probationEndDate: Date): boolean {
  if (probationEndDate > new Date()) {
    return true;
  }
  return false;
}
