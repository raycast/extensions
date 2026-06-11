import { fetchInputSources, setInputSource } from "../commands";

type Input = {
  /**
   * The tagID of the display.
   */
  tagID: string;
  /**
   * The VCP value of the input source to switch to (e.g., "208", "144").
   */
  vcpValue: string;
};

export default async function toolSetInputSource(input: Input) {
  const sources = await fetchInputSources(input.tagID);
  const source = sources.find((s) => s.vcpValue === input.vcpValue);
  await setInputSource(input.tagID, input.vcpValue, source?.ddc2ab ?? false);
  return `Input source changed to ${source?.label ?? input.vcpValue}`;
}
