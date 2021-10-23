/* eslint-disable @typescript-eslint/no-explicit-any */
import Twit from "twit";

interface Preferences {
  access_token_secret: string;
  consumer_key: string;
  consumer_secret: string;
  access_token: string;
}

interface Response {
  id: string;
  handle: string;
}

export default class Twitter {
  client;

  constructor(preferences: Preferences) {
    this.client = new Twit(preferences);
  }

  async tweet(status: string): Promise<Response> {
    const res: any = await this.client.post("statuses/update", { status });
    const { id_str, user } = res.data;
    return { id: id_str, handle: user.screen_name };
  }
}
