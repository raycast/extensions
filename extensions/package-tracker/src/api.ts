import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { Data } from "./types";

export class PackageTrackAPI {
  packageNumber: string;
  readonly headers = {
    "content-type": "application/json",
    "17token": getPreferenceValues().apiKey,
  };
  readonly url: string = "https://api.17track.net/track/v2/";

  constructor(packageNumber: string) {
    this.packageNumber = JSON.stringify([
      {
        number: packageNumber,
      },
    ]);
  }

  async _track() {
    return axios
      .post(this.url + "register", this.packageNumber, { headers: this.headers })
      .then(() => axios.post(this.url + "gettrackinfo", this.packageNumber, { headers: this.headers }))
      .then((trackValue) => {
        axios.post(this.url + "deletetrack", this.packageNumber, { headers: this.headers });
        return trackValue;
      });
  }

  async track() {
    return await this._track().then((trackValue) => {
      console.log(JSON.stringify(trackValue.data));
      return trackValue.data.data as Data;
    });
  }
}
