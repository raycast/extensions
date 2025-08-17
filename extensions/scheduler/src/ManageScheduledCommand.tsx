import { ScheduledCommand, FormValues } from "./types";
import { CommandForm } from "./components/CommandForm";
import { useScheduledCommands } from "./hooks/useScheduledCommands";

type ManageScheduledCommandProps = {
  command?: ScheduledCommand;
  onSave?: () => void;
  draftValues?: Partial<FormValues>;
};

export function ManageScheduledCommand({ command, onSave, draftValues }: ManageScheduledCommandProps) {
  const { addCommand, updateCommand } = useScheduledCommands();

  async function handleSave(savedCommand: ScheduledCommand) {
    if (command) {
      await updateCommand(savedCommand);
    } else {
      await addCommand(savedCommand);
    }
    onSave?.();
  }

  return (
    <CommandForm
      command={command}
      draftValues={draftValues}
      onSave={handleSave}
      title={command ? "Edit Scheduled Command" : "Create New Scheduled Command"}
      submitButtonTitle={command ? "Update Scheduled Command" : "Create Scheduled Command"}
    />
  );
}

export default ManageScheduledCommand;
