import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setInterval(() => {
      if (progress < 1) {
        setProgress(progress + 0.1);
      }
    }, 100);
  });

  return (
    <List>
      <List.Item icon={getProgressIcon(progress)} title="Loading chords..." />
    </List>
  );
}
