import { NamedPortForm } from "./components/named-port-form";
import { useNamedPorts } from "./hooks/useNamedPorts";

function CreateNamedPort() {
  const { createNamedPort } = useNamedPorts();
  return (
    <NamedPortForm
      onSubmit={(values) => {
        createNamedPort(parseInt(values.port), { name: values.name });
      }}
      resetAfterSubmitSucess
    />
  );
}

export default CreateNamedPort;
