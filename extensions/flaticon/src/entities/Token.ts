import { LocalStorage } from '@raycast/api';

type SerializedToken = {
  token: string;
  expires: number;
  createdAt?: number;
};

export type Token = {
  token: string;
  expires: number;
  createdAt?: number;
};

export const newToken = ({ token, expires }: SerializedToken): Token => ({
  token,
  expires,
  createdAt: Date.now() / 1000,
});
export const emptyToken = (): Token => ({ token: '', expires: 0, createdAt: 0 });
export const tokenValid = ({ expires, createdAt }: Token): boolean => {
  let expirationDate = expires;
  if (createdAt) {
    expirationDate += createdAt;
  }
  return expirationDate - Date.now() / 1000 > 30;
};
export const tokenAuthHeader = ({ token }: Token) => ({ Authorization: `Bearer ${token}` });

export const tokenToLocalStorage = async (apiKey: string, token: Token): Promise<void> => {
  if (!apiKey) throw new Error('No API key provided');

  return await LocalStorage.setItem(apiKey, JSON.stringify(token));
};

export const tokenFromLocalStorage = async (apiKey: string): Promise<Token> => {
  if (!apiKey) throw new Error('No API key provided');

  const token = await LocalStorage.getItem(apiKey);

  if (!token) return emptyToken();

  return parse(token);
};

const parse = (serialized: LocalStorage.Value): Token => {
  if (!serialized) return emptyToken();
  if (typeof serialized !== 'string') return emptyToken();

  const { token, expires, createdAt } = JSON.parse(serialized) as SerializedToken;

  return { token, expires, createdAt };
};
