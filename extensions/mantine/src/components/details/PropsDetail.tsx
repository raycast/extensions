import { List } from "@raycast/api";
import { Fragment } from "react";
import { getComponentProps } from "../../helpers/getComponentProps";
import { ComponentName } from "../../types/ComponentName";

type Props = {
  component: ComponentName;
};

export const PropsDetail = ({ component }: Props) => {
  const props = getComponentProps(component);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Props" text="type" />
          <List.Item.Detail.Metadata.Label title="" />

          {Object.values(props).map(({ name, type }) => (
            <Fragment key={name}>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={name} text={type.name} />
            </Fragment>
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
