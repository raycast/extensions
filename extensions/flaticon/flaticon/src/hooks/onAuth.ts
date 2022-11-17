import {useEffect, useState} from "react";
import {Token} from "../entities/Token";
import {auth} from "../flows/auth";

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
