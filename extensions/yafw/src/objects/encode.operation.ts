import { showHUD } from "@raycast/api";
import { Files, Operation } from "../abstractions";

export class NoFilesProvidedException extends Error {}

/**
 * Run encode operation on specified files.
 * @throws if no files provided.
 */
export class EncodeOperation implements Operation {
  constructor(
    private readonly files: Files,
    private readonly operation: (files: Awaited<ReturnType<Files["list"]>>) => Promise<void>,
  ) {}

  run: Operation["run"] = async () => {
    const files = await this.files.list();

    if (files.length === 0) {
      throw new NoFilesProvidedException();
    }

    await this.operation(files);

    await showHUD("All Videos are Processed");
  };
}
