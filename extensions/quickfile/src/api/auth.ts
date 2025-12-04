import { createHash } from "node:crypto";
import { getPreferenceValues } from "@raycast/api";
import { nanoid } from "nanoid";

const hash = (val: string) => createHash("md5").update(val).digest("hex");

export const getHeader = () => {
  const { accountNumber, appId, apiKey } = getPreferenceValues();

  const submission = nanoid();
  const md5sum = hash(`${accountNumber}${apiKey}${submission}`);

  return {
    MessageType: "Request",
    SubmissionNumber: submission,
    Authentication: {
      AccNumber: accountNumber,
      MD5Value: md5sum,
      ApplicationID: appId,
    },
  };
};
