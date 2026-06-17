import jsonToGo from "json-to-go";
import gofmt from "gofmt.js";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return gofmt(jsonToGo(value).go);
    },
  });

  return <DefaultForm {...formProps} />;
};
