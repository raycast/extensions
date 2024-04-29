import axios from "axios";
import { File } from "../abstractions";

export class RemoteFile implements File {
  constructor(
    private readonly _url: string,
    private readonly localFile: File,
  ) {}

  path: File["path"] = () => this._url;

  stream: File["stream"] = async () => {
    const response = await axios({
      method: "GET",
      url: this._url,
      responseType: "stream",
    });
    await this.localFile.write(response.data);
    return this.localFile.stream();
  };

  nextName: File["nextName"] = (counter) => this.localFile.nextName(counter);

  write: File["write"] = (content) => this.localFile.write(content);
}
