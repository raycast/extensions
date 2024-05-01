import decompress from "decompress";
import { Archive, File } from "../abstractions";

export class ZipArchive implements File, Archive {
  constructor(private readonly file: File) {}

  path: File["path"] = () => this.file.path();

  extension: File["extension"] = () => this.file.extension();

  exists: File["exists"] = () => this.file.exists();

  hash: File["hash"] = () => this.file.hash();

  stream: File["stream"] = () => this.file.stream();

  nextName: File["nextName"] = () => this.file.nextName();

  download: File["download"] = (fromUrl) => this.file.download(fromUrl);

  write: File["write"] = (content) => this.file.write(content);

  remove: File["remove"] = () => this.file.remove();

  extract: Archive["extract"] = async (toFolder) => {
    await toFolder.createIfNotExists();
    await decompress(this.file.path(), toFolder.path());
  };
}
