import React from "react";

import { Grid, Icon } from "@raycast/api";
import { useLoadingToast } from "../hooks";

export type IdleScreenProps = {
  stepsLog?: string | null;
  title: string;
  pending: boolean;
  icon?: (typeof Icon)[keyof typeof Icon];
  children?: React.ReactNode;
};

export const IdleScreen: React.FC<IdleScreenProps> = (props) => {
  useLoadingToast(props.pending ? props.stepsLog ?? props.title : null);

  if (props.pending) {
    return (
      <Grid>
        <Grid.EmptyView icon={props.icon || Icon.Terminal} title={props.title} />
      </Grid>
    );
  } else {
    return <>{props.children}</>;
  }
};

export const IdleStop: React.FC<{ children: React.ReactNode }> = (props) => {
  useLoadingToast(null);

  return <>{props.children}</>;
};
