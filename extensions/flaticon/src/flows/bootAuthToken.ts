import { Token, tokenFromLocalStorage, tokenToLocalStorage, tokenValid } from '../entities/Token';
import { issueAuthToken } from './issueAuthToken';

export const bootAuthToken = async (apiKey: string): Promise<{ token: Token; error?: Error }> => {
  const localStorageToken = await tokenFromLocalStorage(apiKey);

  if (tokenValid(localStorageToken)) return { token: localStorageToken };

  const { token, error } = await issueAuthToken(apiKey);
  await tokenToLocalStorage(apiKey, token);

  return { token, error };
};
