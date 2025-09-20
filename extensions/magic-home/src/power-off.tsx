import PowerHandler from "./power-handler";

export default async function Command() {
  await PowerHandler(false);
}
