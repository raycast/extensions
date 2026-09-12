import { emptyToken, newToken, Token } from '../entities/Token';
import fetch from 'cross-fetch';

export const issueAuthToken = async (apikey: string): Promise<{ token: Token; error?: Error }> => {
  const response = await fetch(authURI, options(apikey));

  // noinspection TypeScriptValidateJSTypes
  const body = (await response.json()) as { data: { token: string; expires: number }; error?: string };
  if (body.error) return { token: emptyToken(), error: new Error(body.error) };

  const { token, expires } = body.data;

  return { token: newToken({ token, expires }), error: undefined };
};

const authURI = 'https://api.flaticon.com/v3/app/authentication';
const options = (apikey: string) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apikey }),
});
