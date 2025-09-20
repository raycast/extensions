export default function timestampToDate(timestamp: string) {
  return new Date(Number(timestamp) * 1000);
}
