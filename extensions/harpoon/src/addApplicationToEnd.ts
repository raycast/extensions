import addApplication from "./addApplication";

export default async function addApplicationToEnd() {
  await addApplication("last");
}
