import {LocalStorage} from "@raycast/api";

type SerializedToken = {
  token: string;
  expires: number;
};

export class Token {
  constructor(private token: string, private expires: number) {
  }

  valid = () => this.expires - (Date.now() / 1000) > 30;

  authHeader = () => ({Authorization: `Bearer ${this.token}`});

  toLocalStorage = async (apiKey: string): Promise<void> => {
    if (!apiKey) throw new Error("No API key provided");

    await LocalStorage.setItem(apiKey, this.serialize());
  }

  private serialize = () => JSON.stringify({token: this.token, expires: this.expires} as SerializedToken)

  static fromLocalStorage = async (apiKey: string): Promise<Token> => {
    if (!apiKey) return new Token("", 0);

    return this.parse(await LocalStorage.getItem(apiKey));
  }

  static parse = (serialized: LocalStorage.Value | undefined): Token => {
    if (!serialized) return new Token("", 0);
    if (typeof serialized !== "string") return new Token("", 0);

    const parsed = JSON.parse(serialized) as SerializedToken;

    return new Token(parsed.token, parsed.expires);
  }
}
