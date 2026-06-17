export default function stripQParams(url: string) {
  const earl = new URL(url);
  earl.search = "";
  return earl.toString();
}
