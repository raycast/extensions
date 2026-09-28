import { ActionPanel } from "@raycast/api";
import { useState } from "react";

type LazySubmenuProps = Omit<ActionPanel.Submenu.Props, "children"> & {
  /** Builds the submenu's items. Only called once the submenu has been opened. */
  children: () => ActionPanel.Submenu.Props["children"];
};

/**
 * Raycast renders a list item's actions again each time the selection moves, so a submenu listing every task,
 * project or label would be rebuilt and sent to Raycast on every move. This submenu builds its items on open.
 */
export default function LazySubmenu({ children, onOpen, ...props }: LazySubmenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ActionPanel.Submenu
      {...props}
      onOpen={() => {
        setIsOpen(true);
        onOpen?.();
      }}
    >
      {isOpen ? children() : null}
    </ActionPanel.Submenu>
  );
}
