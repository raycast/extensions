import { useForm } from "./lib/use-form";
import postcss from "postcss";
import postcssJs from "postcss-js";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: (value: string) => {
      const css = postcss.parse(value);
      return JSON.stringify(postcssJs.objectify(css), null, 2);
    },
  });

  return <DefaultForm {...formProps} />;
};
