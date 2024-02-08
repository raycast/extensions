import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [time, setTime] = useState("");

  useEffect(() => {
    setInterval(() => {
      const date = new Date();
      setTime(`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`);
    }, 1);
  });

  return <Detail markdown={`# ${time}`} />;
}
