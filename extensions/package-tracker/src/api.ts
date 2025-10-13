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

  _track() {
    return axios
      .post(this.url + "register", this.packageNumber, { headers: this.headers })
      .then((registerResponse) => {
        console.debug(JSON.stringify(registerResponse.data));
        return axios.post(this.url + "gettrackinfo", this.packageNumber, { headers: this.headers });
      })
      .then((trackValue) => {
        console.debug(JSON.stringify(trackValue.data));

        axios
          .post(this.url + "deletetrack", this.packageNumber, { headers: this.headers })
          .catch((error) => console.error("Error deleting track:", error));

        return trackValue;
      })
      .catch((error) => {
        console.error("API request failed:", error);
        throw error;
      });
  }

  async track() {
    return await this._track().then((trackValue) => {
      console.log(JSON.stringify(trackValue.data));
      return trackValue.data.data as Data;
    });
  }
}
