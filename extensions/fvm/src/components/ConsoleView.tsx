import { Detail } from "@raycast/api";
import { memo, useCallback, useEffect } from "react";
import { useFvmRunner } from "../lib/runner";
import { convertCommandOutput } from "../lib/utils";

export enum CommandType {
  Install = "install",
  Remove = "remove",
  Setup = "setup",
}

type Props = {
  command: CommandType;
  version: string;
  onCompletion?: () => void;
};

function ConsoleView({ command, version, onCompletion }: Props) {
  const runner = useFvmRunner();

  const title = command === CommandType.Install ? "Install" : command === CommandType.Remove ? "Remove" : "Setup";

  const runCommand = useCallback(async () => {
    switch (command) {
      case CommandType.Install:
        await runner.install(version);
        break;
      case CommandType.Remove:
        await runner.remove(version);
        break;
      case CommandType.Setup:
        await runner.setup(version);
        break;
    }

    onCompletion?.();
  }, [command, version]);

  useEffect(() => {
    runCommand();
  }, []);

  const content = convertCommandOutput(runner.stdout);

  return <Detail navigationTitle={title} isLoading={runner.isRunning} markdown={content} />;
}

//  Return memo=ized component
export default memo(ConsoleView);
