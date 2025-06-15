import { Color, Icon } from "@raycast/api";
import { FC } from "react";
import { ContextProps } from "../../hooks/preview";
import { ItemField } from "../atoms/item";
import { NumberItem } from "../molecules/numberItem";

export type Props = {
  context: ContextProps;
};

export const Section3: FC<Props> = ({ context }) => (
  <>
    <NumberItem id="1" context={context} />
    <NumberItem id="2" context={context} />
    <NumberItem id="3" context={context} />
    <NumberItem id="0" context={context} />
    <ItemField id="undo" icon={Icon["Undo"]} title="Undo" context={context} />
    <ItemField
      id="clean"
      icon={Icon["Trash"]}
      title="Clear"
      color={Color.Red}
      context={context}
    />
    <ItemField
      id="finish"
      icon={Icon["CheckCircle"]}
      title="Finish"
      color={Color.Green}
      context={context}
    />
  </>
);
