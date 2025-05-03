import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [time, setTime] = useState("");

  useEffect(() => {
    setInterval(() => {
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      setTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
  });

  return <Detail isLoading={time == ""} markdown={`# ${time}`} />;
}
