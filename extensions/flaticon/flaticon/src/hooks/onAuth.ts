import {useEffect, useState} from "react";
import {LocalStorage} from "@raycast/api";

type SerializedToken = {
  token: string;
  expires: number;
};

export class Token {
  constructor(private token: string, private expires: number) {
  }

  valid = () => {
    const validity = this.expires - (Date.now() / 1000) > 30;

    console.debug(`Token validity: ${validity}`);

    return validity;
  }

  auth = () => ({Authorization: `Bearer ${this.token}`});

  toLocalStorage = async (apiKey: string): Promise<void> => {
    if (!apiKey) throw new Error("No API key provided");

    console.debug(`Saving token to local storage`);
    await LocalStorage.setItem(apiKey, this.serialize());
  }

  private serialize() {
    return JSON.stringify({token: this.token, expires: this.expires} as SerializedToken);
  }

  static fromLocalStorage = async (apiKey: string): Promise<Token> => {
    if (!apiKey) {
      console.debug("No API key provided");
      return new Token("", 0);
    }

    return this.parse(await LocalStorage.getItem(apiKey));
  }

  static parse = (serialized: LocalStorage.Value | undefined): Token => {
    if (!serialized) {
      console.debug("No serialized token provided");
      return new Token("", 0);
    }

    if (typeof serialized !== "string") {
      console.debug("Serialized token is not a string");
      return new Token("", 0);
    }

    const parsed = JSON.parse(serialized) as SerializedToken;
    console.debug("Parsed token", parsed);

    return new Token(parsed.token, parsed.expires);
  }
}

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
