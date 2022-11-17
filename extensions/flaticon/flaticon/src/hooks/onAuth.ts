import {useEffect, useState} from "react";
import {emptyToken, Token, tokenFromLocalStorage, tokenToLocalStorage, tokenValid} from "../entities/Token";
import {auth} from "../flows/auth";

export type State = {
  token: Token;
  isLoading: boolean;
}

export default (apiKey: string) => {
  const [state, setState] = useState<State>({token: emptyToken(), isLoading: true});

  const load = async (apiKey: string): Promise<void> => {
    let token = await tokenFromLocalStorage(apiKey);

    if (!tokenValid(token)) {
      token = await auth(apiKey);
      await tokenToLocalStorage(apiKey, token)
    }

    await setState({token, isLoading: false});
  };

  useEffect(() => {
    // noinspection JSIgnoredPromiseFromCall
    load(apiKey);
  }, [apiKey]);

  return state;
};
