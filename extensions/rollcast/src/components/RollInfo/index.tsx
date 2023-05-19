import { Form } from "@raycast/api";
import React, { FC } from "react";
import { Roll } from "types";
import { getRollText } from "utils/string";
import { RollType } from "enums";

interface Props {
  index: number;
  roll: Roll;
  type?: RollType;
}

export const RollInfo: FC<Props> = ({ roll, index, type }) => {
  const order = index + 1;
  const text = getRollText(roll, type);

  return <Form.Description title={`🎲 Roll #${order}:`} text={`${text}`} />;
};
