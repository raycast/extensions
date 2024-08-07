import { ethers } from "ethers";
import got from "got";
import { MRU_DOMAIN, addToStore } from "./storage";

export async function hasValidCredentials(apiUrl: string, privateKey: string) {
  if (!apiUrl || !privateKey) {
    return false;
  }

  try {
    const { body } = await got(`${apiUrl}/config`);
    if (!body) {
      return false;
    }
    new ethers.Wallet(privateKey);
    await addToStore(MRU_DOMAIN, JSON.parse(body).domain);
    return true;
  } catch (error) {
    return false;
  }
}

export const titleCase = (str: string) => {
  return str.replace(/(^|\s)\S/g, function (t) {
    return t.toUpperCase();
  });
};

export const tryParse = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return jsonString;
  }
};

export const mdJson = (data: unknown) => {
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
};
