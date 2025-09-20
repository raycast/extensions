import crypto from "node:crypto";
import { useMemo } from "react";

import { showFailureToast, useFetch } from "@raycast/utils";

const getPasswordSha = (password: string): string => {
  const hash = crypto.createHash("sha1");
  hash.update(password);
  return hash.digest("hex").toUpperCase();
};

export const useOnlineCheck = (password: string) => {
  const sha = getPasswordSha(password);

  const url = useMemo(() => {
    return `https://api.pwnedpasswords.com/range/${sha.slice(0, 5)}`;
  }, [sha]);

  const { data, isLoading } = useFetch(url!, {
    execute: !!url,
    parseResponse: async (response) => {
      const text = await response.text();

      return text.split("\n").map((line) => {
        const [hash, count] = line.split(":");
        return { hash, count: parseInt(count, 10) };
      });
    },
    onError(error) {
      showFailureToast("Failed to fetch data", error);
    },
  });

  const result = useMemo(() => {
    if (isLoading || !data) {
      return "Loading...";
    }
    const find = data.find((item) => item.hash.toUpperCase().localeCompare(sha.slice(5)) === 0);
    if (!find) {
      return `# Online Password Check

## Congratulations!

It appears your password hasn't been found in online databases.`;
    }
    return `# Online Password Check

## Warning!

Your password has been found \`${find.count}\` times in online databases.

Please consider using a different password.`;
  }, [data, isLoading, sha]);

  return { result, isLoading };
};
