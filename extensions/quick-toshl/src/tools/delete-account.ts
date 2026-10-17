import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  accountId: string;
};

export default async function deleteAccount(input: Input) {
  await toshl.deleteAccount(input.accountId.trim());
  return {
    success: true,
    message: "Account deleted.",
    _instructions: AI_INSTRUCTIONS,
  };
}
