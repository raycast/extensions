import openApplicationByIndex from "./openApplicationByIndex";

export default async function openApplicationOne() {
  await openApplicationByIndex(0);
}
