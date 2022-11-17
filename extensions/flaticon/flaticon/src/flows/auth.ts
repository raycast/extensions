import {newToken, Token} from "../entities/Token";

export const auth = async (apikey: string): Promise<Token> => {
  const response = await fetch(authURI, options(apikey));

  // noinspection TypeScriptValidateJSTypes
  const body = await response.json() as { data: { token: string, expires: number }, error?: string };
  if (body.error) throw new Error(body.error);

  const {token, expires} = body.data;

  return newToken({token, expires});
}

const authURI = 'https://api.flaticon.com/v3/app/authentication';
const options = (apikey: string) => ({
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({apikey}),
})