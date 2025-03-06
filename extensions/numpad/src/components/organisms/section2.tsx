import { Icon } from "@raycast/api";
import { FC } from "react";
import { ContextProps } from "../../hooks/preview";
import { ItemField } from "../atoms/item";
import { NumberItem } from "../molecules/numberItem";

export type Props = {
  context: ContextProps;
};

export const Section2: FC<Props> = ({ context }) => (
  <>
    <NumberItem id="4" context={context} />
    <NumberItem id="5" context={context} />
    <NumberItem id="6" context={context} />
    <ItemField
      id="."
      icon={Icon["CircleProgress100"]}
      title="Point"
      context={context}
    />
    <ItemField id="-" icon={Icon["Minus"]} title="Minus" context={context} />
    <ItemField id="+" icon={Icon["Plus"]} title="Plus" context={context} />
    <ItemField
      id="unSave"
      icon={Icon["HeartDisabled"]}
      title="UnSave"
      context={context}
    />
  </>
);
