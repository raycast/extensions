import { fetchPassword } from "./password";

export default async function Command() {
  await fetchPassword("simple");
}
