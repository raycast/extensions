import type { ZxcvbnResult } from "@zxcvbn-ts/core";

import { useCachedPromise } from "@raycast/utils";

import { checkPasswordStrength } from "@/lib";

export const usePasswordStrength = (
  password: string,
): {
  text: string;
  data: {
    strength: ZxcvbnResult;
    dictionaries: {
      lang: string;
      version: string;
    }[];
  } | null;
  isLoading: boolean;
} => {
  const { data, isLoading } = useCachedPromise(async () => checkPasswordStrength(password), [], {
    keepPreviousData: false,
    initialData: null,
  });

  const text = data?.strength?.feedback
    ? data.strength.feedback.warning
      ? `## Warning!

  The strength meter indicates: \`${data.strength.feedback.warning}\`

  ### Suggestions

  ${data.strength.feedback.suggestions.map((s) => `- ${s}`).join("\n")}`
      : `The stength meter does not indicate any warnings. Do check the details on the right for more information.`
    : "Loading...";

  return {
    isLoading,
    data,
    text,
  };
};
