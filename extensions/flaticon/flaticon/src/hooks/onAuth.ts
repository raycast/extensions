import {useEffect, useState} from "react";
import {Token} from "../entities/Token";

const auth = async (apikey: string): Promise<Token> => {
  console.debug("Authenticating");

  const response = await fetch('https://api.flaticon.com/v3/app/authentication', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({apikey})
  });

  const body = await response.json() as {data: {token: string, expires: number}, error?: string};

  console.debug("Auth response", body);

  if (body.error) throw new Error(body.error);

  return new Token(body.data.token, body.data.expires);
}

export type State = {
  token: Token;
  isLoading: boolean;
}

export default (apiKey: string) => {
  const [state, setState] = useState<State>({token: new Token("", 0), isLoading: true});

  const load = async (apiKey: string): Promise<void> => {
    let token = await Token.fromLocalStorage(apiKey);

    if (!token.valid()) {
      token = await auth(apiKey);
      await token.toLocalStorage(apiKey);
    }

    await setState({token, isLoading: false});
  };

  useEffect(() => {
    // noinspection JSIgnoredPromiseFromCall
    load(apiKey);
  }, [apiKey]);

  return state;
};
