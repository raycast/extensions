import React from "react";

import { ActionCommandDefaultProps, CommandProps } from "../core";
import { ProfilesList } from "../components";

export const wrapActionCommand = (Component: React.FC<ActionCommandDefaultProps>) =>
  function ActionCommandWrapper(props: CommandProps & { profile?: string }) {
    const { command } = props.arguments;
    const { profile } = props;

    return <Component command={command ? [command] : undefined} profile={profile} />;
  };

export const wrapActionWithProfileCommand = (Component: React.FC<ActionCommandDefaultProps>) =>
  function ActionCommandWithProfileWrapper(props: CommandProps & { profile?: string }) {
    const { command } = props.arguments;

    return (
      <ProfilesList>
        {(profile) => <Component command={command ? [command] : undefined} profile={profile} />}
      </ProfilesList>
    );
  };
