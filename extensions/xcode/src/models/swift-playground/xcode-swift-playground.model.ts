/**
 * Xcode Swift Playground
 */
export interface XcodeSwiftPlayground {
  /**
   * The name
   */
  name: string;
  /**
   * The path
   */
  path: string;
  /**
   * Bool value if Playground already exists
   */
  alreadyExists: boolean;
  /**
   * Open Swift Playground
   */
  open: () => Promise<void>;
}
