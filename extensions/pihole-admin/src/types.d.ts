declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass extends React.Component<any> {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare module "react" {
  interface ReactNode {
    // Expand ReactNode to include bigint compatibility
    [key: string]: any;
  }
}

// Force export for module recognition
export {};
