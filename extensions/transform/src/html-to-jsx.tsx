import HTMLtoJSX from "htmltojsx";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

const converter = new HTMLtoJSX({
  createClass: false,
});

export default () => {
  const formProps = useForm({
    transform: (value: string) => {
      return converter.convert(value);
    },
  });

  return <DefaultForm {...formProps} />;
};
