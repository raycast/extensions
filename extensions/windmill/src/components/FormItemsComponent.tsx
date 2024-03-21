import { Form } from "@raycast/api";
import { Properties } from "../types";
import { WorkspaceConfig, Resource, Kind } from "../types";

export const FormItemsComponent = ({
  properties,
  required,
  resources,
}: {
  properties: Properties;
  required: string[] | undefined;
  kind: Kind;
  resources: Resource[];
  workspace: WorkspaceConfig;
}) => {
  return (
    <>
      {Object.keys(properties).map((name, idx) => {
        const property = properties[name];
        let defaultValue = property.default;
        const { type, description, contentEncoding, format, enum: enumValues } = property;

        const title = `${name}${required?.includes(name) ? "*" : ""}`;
        const resource_type = format?.replace(/^resource-/, "");

        if (defaultValue == null) {
          if (type !== "object" && type !== "array") {
            defaultValue = "";
          }
        }

        switch (type) {
          case "string":
            if (contentEncoding === "base64") {
              return <Form.FilePicker key={idx} id={name} title={title} />;
            }
            if (
              format === "email" ||
              format === "hostname" ||
              format === "uri" ||
              format === "uuid" ||
              format === "ipv4"
            ) {
              return <Form.TextField key={idx} id={name} title={title} defaultValue={String(defaultValue)} />;
            } else if (format === "yaml" || format === "sql") {
              return <Form.TextArea key={idx} id={name} title={title} defaultValue={String(defaultValue)} />;
            }
            if (enumValues) {
              return (
                <Form.Dropdown key={idx} id={name} title={title} defaultValue={String(defaultValue)}>
                  {enumValues.map((value, index) => (
                    <Form.Dropdown.Item key={index} value={value} title={value} />
                  ))}
                </Form.Dropdown>
              );
            }

            return <Form.TextField key={idx} id={name} title={title} defaultValue={String(defaultValue)} />;

          case "integer":
          case "number":
            return <Form.TextField key={idx} id={name} title={title} defaultValue={String(defaultValue)} />;
          case "boolean":
            return (
              <Form.Checkbox
                key={idx}
                id={name}
                title={title}
                label={description}
                defaultValue={Boolean(defaultValue)}
              />
            );
          case "object":
            if (resource_type) {
              return (
                <Form.Dropdown key={idx} id={name} title={title} defaultValue={String(defaultValue)}>
                  {/* <Form.Dropdown.Item key="null" value="null" title="null" icon="⚙️" /> */}
                  {resources
                    .filter((resource) => resource.resource_type === resource_type)
                    .map((resource) => (
                      <Form.Dropdown.Item key={resource.path} value={resource.path} title={resource.path} icon="⚙️" />
                    ))}
                </Form.Dropdown>
              );
            } else {
              return <Form.TextArea key={idx} id={name} title={title} defaultValue={JSON.stringify(defaultValue)} />;
            }
          case "array":
            return <Form.TextArea key={idx} id={name} title={title} defaultValue={JSON.stringify(defaultValue)} />;
          default:
            return <Form.TextArea key={idx} id={name} title={title} defaultValue={JSON.stringify(defaultValue)} />;
        }
      })}
    </>
  );
};
