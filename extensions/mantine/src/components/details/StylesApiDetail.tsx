import { List } from "@raycast/api";
import { Fragment } from "react";
import { getComponentStyles } from "../../helpers/getComponentStyles";
import { ComponentName } from "../../types/ComponentName";

type Props = {
  component: ComponentName;
};

export const StylesApiDetail = ({ component }: Props) => {
  const styles = getComponentStyles(component);

  if (!styles)
    return (
      <List.Item.Detail
        markdown={`${component} renders single node, use className, sx or style props to override styles`}
      />
    );

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Name"
            icon={{
              source: {
                light: "icons/code-light.svg",
                dark: "icons/code-dark.svg",
              },
            }}
            text="Static selector"
          />
          <List.Item.Detail.Metadata.Label title="" />
          {styles.map((className) => (
            <Fragment key={className}>
              <List.Item.Detail.Metadata.Label title={className} text={`.mantine-${component}-${className}`} />
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
