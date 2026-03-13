import { YAMLtoJSON } from "@ultirequiem/y2j";
import { stringify } from "@iarna/toml";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: (value: string) => {
      return stringify(JSON.parse(YAMLtoJSON(value)));
    },
  });

  return <DefaultForm {...formProps} />;
};
