export function iife(func: () => unknown) {
  return func();
}

export async function iiafe(func: () => Promise<unknown>) {
  return await func();
}
