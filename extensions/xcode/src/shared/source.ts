/**
 * A Source that holds a generic Value
 * Acts as a wrapper to indicate if the Value is loaded from cache
 */
export interface Source<Value> {
  /**
   * The Value
   */
  value: Value;
  /**
   * Bool value if Value is loaded from cache
   */
  isCache: boolean;
}
