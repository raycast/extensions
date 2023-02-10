import { JSONWasm } from "json-wasm";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      JSON.parse(value);
      return await JSONWasm("Root", value, { output_mode: "typescript" });
    },
  });

  return <DefaultForm {...formProps} />;
};
