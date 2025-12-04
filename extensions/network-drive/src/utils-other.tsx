export function delayOperation(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
