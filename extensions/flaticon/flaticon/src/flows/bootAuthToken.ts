import {Token, tokenFromLocalStorage, tokenToLocalStorage, tokenValid} from "../entities/Token";
import {issueAuthToken} from "./issueAuthToken";

export const bootAuthToken = async (apiKey: string): Promise<Token> => {
  let token = await tokenFromLocalStorage(apiKey);

  if (!tokenValid(token)) {
    token = await issueAuthToken(apiKey);
    await tokenToLocalStorage(apiKey, token);
  }

  return token;
}