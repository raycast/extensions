import { setInputSource } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
  /**
   * The VCP value of the input source to switch to (e.g., "208", "144").
   */
  vcpValue: string;
  /**
   * Whether to use DDC alternate addressing (LG alt). Set to true for LG displays.
   */
  ddc2ab: boolean;
};

export default async function toolSetInputSource(input: Input) {
  await setInputSource(input.tagID, input.vcpValue, input.ddc2ab);
  return `Input source changed to ${input.vcpValue}`;
}
