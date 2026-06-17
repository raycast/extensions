import { Icon } from "@raycast/api";
import { ItemField } from "../atoms/item";
import { NumberItem } from "../molecules/numberItem";
import { FC } from "react";
import { ContextProps } from "../../hooks/preview";

export type Props = {
  context: ContextProps;
};

export const Section1: FC<Props> = ({ context }) => (
  <>
    <NumberItem id="7" context={context} />
    <NumberItem id="8" context={context} />
    <NumberItem id="9" context={context} />
    <ItemField
      id="="
      icon={Icon["ShortParagraph"]}
      title="Equal"
      context={context}
    />
    <ItemField
      id="*"
      icon={Icon["Multiply"]}
      title="Multiply"
      context={context}
    />
    <ItemField id="/" icon={Icon["Italics"]} title="Divide" context={context} />
    <ItemField id="save" icon={Icon["Heart"]} title="Save" context={context} />
  </>
);
