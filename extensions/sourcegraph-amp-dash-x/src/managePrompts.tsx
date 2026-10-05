import PromptList from "./components/PromptList";

export default function ManagePrompts() {
  return (
    <PromptList
      showManageActions={true}
      searchPlaceholder="Search prompts to manage..."
      emptyTitle="No prompts to manage"
      emptyDescription="Add your first prompt to get started"
    />
  );
}
