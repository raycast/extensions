import { Form } from "@raycast/api";
import { useModel } from "../../hooks/useModel";
import { getConfiguration } from "../../hooks/useChatGPT";

export function ModelField(
  props: Pick<Form.TextField.Props, "id" | "value" | "onChange" | "onBlur" | "error" | "info">,
) {
  const models = useModel(true);
  const { isCustomModel } = getConfiguration();
  const options = [...new Set([props.value, ...models.option].filter((value): value is string => !!value))];
  return isCustomModel ? (
    <Form.TextField title="Model" placeholder="Custom model name" {...props} />
  ) : (
    <Form.Dropdown title="Model" placeholder="Choose model option" isLoading={models.isFetching} {...props}>
      {options.map((option) => (
        <Form.Dropdown.Item value={option} title={option} key={option} />
      ))}
    </Form.Dropdown>
  );
}
