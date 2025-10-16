import React from "react";
import { Detail } from "@raycast/api";

export default function Unresponsive() {
  return (
    <Detail
      markdown={`# Error from API \n Unfortunately the data returned from [the NHL API](https://api-web.nhle.com) was unresponsive. Please try again later.`}
    />
  );
}
