import CreateEntity from "./create-entity";

/** Compatibility command. New task creation uses the one live-profile form. */
export default function CreateTask() {
  return <CreateEntity initialProfileSlug="task" lockProfile />;
}
