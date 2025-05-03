import { withAccessToken } from "@raycast/utils";
import { basecamp } from "./oauth/auth";
import CreateTodoSelectListForm from "./components/CreateTodoSelectListForm";

function CreateTodoSelectListCommand() {
  return <CreateTodoSelectListForm />;
}

export default withAccessToken(basecamp)(CreateTodoSelectListCommand);
