export default function isNotNull<T>(val: T | null | undefined): val is T {
  return val != null;
}
