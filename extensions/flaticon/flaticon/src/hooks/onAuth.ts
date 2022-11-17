import {useEffect, useState} from "react";
import {emptyToken, Token} from "../entities/Token";
import {bootAuthToken} from "../flows/bootAuthToken";

type State = {
  token: Token;
  isLoading: boolean;
}

export default (apiKey: string) => {
  const [state, setState] = useState<State>({token: emptyToken(), isLoading: true});

  useEffect(() => {
    bootAuthToken(apiKey).then(token => setState({token, isLoading: false}));
  }, [apiKey]);

  return state;
};
