import React from "react";
import { LaunchProps } from "@raycast/api";
import { SourceDetail } from "./lib/components/SourceDetail";

/**
 * Arguments interface for get-source command
 */
interface Arguments {
  reference: string;
}

/**
 * Main get source command component
 */
export default function GetSourceCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const { reference } = props.arguments;

  return <SourceDetail reference={reference} />;
}
