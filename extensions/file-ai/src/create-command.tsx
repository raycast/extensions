import { useEffect } from "react";
import { installDefaults } from "./file-utils";
import FileAICommandForm from "./FileAICommandForm";

export default function Command() {
  useEffect(() => {
    installDefaults();
  }, []);

  return <FileAICommandForm />;
}
