import { LocalStorage, Tool } from "@raycast/api";
import { getSocialSetDetail } from "../lib/api";
import { DEFAULT_SOCIAL_SET_STORAGE_KEY } from "../lib/constants";

type Input = { social_set_id: number };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Use social set #${input.social_set_id} as the default Typefully account?`,
});
export default async function tool(input: Input) {
  const socialSet = await getSocialSetDetail(input.social_set_id);
  await LocalStorage.setItem(DEFAULT_SOCIAL_SET_STORAGE_KEY, String(input.social_set_id));
  return { success: true, social_set_id: input.social_set_id, name: socialSet.name, username: socialSet.username };
}
