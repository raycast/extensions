import { CommandForm } from "./views/command/from";
import { useCommand } from "./hooks/useCommand";
import { AuthGate } from "./views/auth-required";

export default function CreateAiCommand() {
  return (
    <AuthGate>
      <CreateAiCommandView />
    </AuthGate>
  );
}

function CreateAiCommandView() {
  const commands = useCommand();

  return <CommandForm use={{ commands }} />;
}
