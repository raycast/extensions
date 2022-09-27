import { useState } from "react";
import { MenuBarExtra, showHUD } from "@raycast/api";
import ToggleCaffeinate from "./toggleCaffeinate";

export default function Command() {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await ToggleCaffeinate();
      setLoading(false);
    } catch (_) {
      await showHUD("⚠️ Something went wrong.");
    }
  };

  return (
    <MenuBarExtra icon={{ source: "logo-menu-bar.svg" }}>
      <MenuBarExtra.Item title="Toggle caffeination" onAction={() => toggle()} />
    </MenuBarExtra>
  );
}
