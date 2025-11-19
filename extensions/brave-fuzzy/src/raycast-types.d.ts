// Custom type definitions to extend Raycast API JSX compatibility
import type * as React from "react";

declare global {
  namespace JSX {
    interface ElementChildrenAttribute {
      children: React.ReactNode;
    }
  }
}

// Augment React types to be more permissive with ReactNode
declare module "react" {
  interface ReactPortal {
    children?: React.ReactNode;
  }
}
