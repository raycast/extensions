export default function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
