import { moveTo } from "../desk";

type Input = {
  /* The height to move the desk to in cm */
  height: number;
};

export default async function moveDesk({ height }: Input) {
  return await moveTo(height);
}
