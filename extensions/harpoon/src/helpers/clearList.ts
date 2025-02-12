import setList from "./setList";

export default async function clearList(): Promise<void> {
  await setList([]);
}
