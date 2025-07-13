import React from "react";
import { Process } from "./process";
import { getImages } from "./supports/image";

export default function Index() {
  return <Process workflowName={"default"} imageLoader={getImages} />;
}
