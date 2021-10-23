/* eslint-disable @typescript-eslint/no-explicit-any */
import Twit from "twit";
import { Preferences } from "./types";

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
