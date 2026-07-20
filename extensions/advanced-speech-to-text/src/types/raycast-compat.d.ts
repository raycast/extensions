// Type compatibility fixes for Raycast API with React 17

// Override JSX namespace to accept async components
declare namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Element = any;
  interface IntrinsicElements {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [elemName: string]: any;
  }
}
