import { CommandForm } from "./views/command/from";
import { useCommand } from "./hooks/useCommand";

export default function CreateAiCommand() {
  const commands = useCommand();

  return <CommandForm use={{ commands }} />;
}
