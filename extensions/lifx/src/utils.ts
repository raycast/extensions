import { getPreferenceValues } from "@raycast/api";

export default function getAccsesToken() {
  const token = getPreferenceValues();
  return token;
}

export const config = {
  headers: {
    Authorization: "Bearer " + getAccsesToken(),
  },
};
