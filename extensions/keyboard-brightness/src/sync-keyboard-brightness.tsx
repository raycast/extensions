import { getSystemBrightness, setStoredBrightness } from "./utils";

const Command = async () => {
  const brightness = await getSystemBrightness();
  await setStoredBrightness(brightness!);
};

export default Command;
