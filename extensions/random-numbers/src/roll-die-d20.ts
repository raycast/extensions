import RollDie from "./roll-die";

export default async function Command() {
  await RollDie(1, 20);
}
