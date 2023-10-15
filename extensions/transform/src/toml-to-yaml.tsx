import { parse } from "@iarna/toml";
import { JSONtoYAML } from "@ultirequiem/y2j";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: (value: string) => {
      return JSONtoYAML(JSON.stringify(parse(value)));
    },
  });

  return <DefaultForm {...formProps} />;
};
