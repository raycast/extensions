import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: async (value: string) => {
      return JSON.stringify(JSON.parse(value || "{}"), null, 2)
        .replace(/\{/gm, "bson.M{")
        .replace(/\[/gm, "bson.A{")
        .replace(/\]/gm, "}")
        .replace(/(\d|\w|")$/gm, "$1,")
        .replace(/(\}$)(\n)/gm, "$1,$2");
    },
  });

  return <DefaultForm {...formProps} />;
};
