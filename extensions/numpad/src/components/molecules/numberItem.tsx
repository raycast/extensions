import { FC } from "react";
import { ItemField, ItemProps } from "../atoms/item";
import { Icon } from "@raycast/api";

export type Props = Pick<ItemProps, "id" | "context">;

export const NumberItem: FC<Props> = ({ id, context }) => {
  return (
    <ItemField
      id={id}
      icon={Icon[("Number0" + id) as keyof typeof Icon]}
      title={"Number " + id}
      context={context}
    />
  );
};
