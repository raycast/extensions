import { Form } from "@raycast/api";
import { ComponentProps } from "react";
import { useApps } from "../../hooks/use-apps";
import { Openable } from "../../types/openable";
import { isNotEmpty } from "../../utitlities/is-not-empty";

export function DefaultAppDropdown(
  props: { openable: Openable | undefined } & Omit<ComponentProps<typeof Form.Dropdown>, "children" | "isLoading">,
) {
  const { openable, ...forwardProps } = props;

  const { isLoadingApps, apps } = useApps(openable, {
    onData: (data) => {
      if (props.onChange) {
        props.onChange(data.defaultApp.path);
      }
    },
  });

  return (
    <Form.Dropdown {...forwardProps} isLoading={isLoadingApps}>
      {apps?.defaultApp && (
        <Form.Dropdown.Section title="Default App">
          <Form.Dropdown.Item
            title={apps.defaultApp.name}
            value={apps.defaultApp.path}
            icon={{ fileIcon: apps.defaultApp.path }}
          />
        </Form.Dropdown.Section>
      )}
      {isNotEmpty(apps?.compatibleApps) && (
        <Form.Dropdown.Section title="Recommended Apps">
          {apps.compatibleApps.map((app) => {
            return (
              <Form.Dropdown.Item key={app.path} title={app.name} icon={{ fileIcon: app.path }} value={app.path} />
            );
          })}
        </Form.Dropdown.Section>
      )}
      {isNotEmpty(apps?.otherApps) && (
        <Form.Dropdown.Section title="Other Apps">
          {apps.otherApps.map((app) => {
            return (
              <Form.Dropdown.Item key={app.path} title={app.name} icon={{ fileIcon: app.path }} value={app.path} />
            );
          })}
        </Form.Dropdown.Section>
      )}
    </Form.Dropdown>
  );
}
