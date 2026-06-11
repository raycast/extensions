import { Form } from "@raycast/api";
import { PullImageForm } from "./components/PullImageForm";
import { useDependencyCheck } from "./hooks/useDependencyCheck";

export default function Command() {
  const { dockerAvailable, isChecking } = useDependencyCheck({ docker: true });

  if (!isChecking && !dockerAvailable) {
    return (
      <Form>
        <Form.Description
          title="Docker Not Available"
          text="Docker CLI is not found or Docker is not running. Start a Colima instance first."
        />
      </Form>
    );
  }

  return <PullImageForm />;
}
