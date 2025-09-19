// Compatibility shim for legacy JSX.Element annotations with React 19 types
// Ensures JSX.Element resolves to React.JSX.Element
import type * as React from "react";

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
  }
}

export {};
