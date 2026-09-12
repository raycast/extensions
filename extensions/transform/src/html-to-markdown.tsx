import { NodeHtmlMarkdown } from "node-html-markdown";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const formProps = useForm({
    transform: (value: string) => new NodeHtmlMarkdown().translate(value),
  });

  return <DefaultForm {...formProps} />;
};
