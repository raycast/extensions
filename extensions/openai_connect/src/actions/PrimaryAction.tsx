import { Action, Icon } from "@raycast/api";
import { FC } from "react";
import type { PrimaryActionProps } from "../types";

export const PrimaryAction: FC<PrimaryActionProps> = ({ title, onAction }) => (
  <Action title={title} icon={Icon.ArrowRight} onAction={onAction} />
);
