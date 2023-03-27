import { useEffect } from "react";
import { installDefaults } from "./utils/file-utils";
import FileAICommandForm from "./FileAICommandForm";

export default function Command() {
  useEffect(() => {
    installDefaults();
  }, []);

  return <FileAICommandForm />;
}
