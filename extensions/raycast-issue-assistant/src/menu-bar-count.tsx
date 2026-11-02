import { MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("https://api.acme-tracker.test/issues/count")
      .then((response) => response.json())
      .then((body) => setCount((body as { count: number }).count));
  }, []);

  return (
    <MenuBarExtra isLoading title={`${count}`}>
      <MenuBarExtra.Item title="Open Issue" onAction={() => setCount(0)} />
      <MenuBarExtra.Item title="Open Issue" onAction={() => setCount(1)} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Refresh"
        onAction={() => setCount(2)}
        alternate={<MenuBarExtra.Item title="Reset" shortcut={{ modifiers: ["opt"], key: "r" }} onAction={() => setCount(0)} />}
      />
    </MenuBarExtra>
  );
}
