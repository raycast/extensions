import React from "react";
import { Process } from "./process";
import { getFiles } from "./supports/image";

export default function Index() {
  return <Process workflowName={"file"} imageLoader={getFiles} />;
}
