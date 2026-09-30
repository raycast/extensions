declare module "@gerhobbelt/gitignore-parser" {
  interface GitIgnoreHelper {
    /**
     * Return TRUE when the given `input` path PASSES the gitignore filters,
     * i.e. when the given input path is DENIED.
     *
     * Notes:
     * - you MUST postfix a input directory with '/' to ensure the gitignore
     *   rules can be applied conform spec.
     * - you MAY prefix a input directory with '/' when that directory is
     *  'rooted' in the same directory as the compiled.gitignore spec file.
     *
     * @param {string} input The path to inspect.
     * @param {boolean | null} expected Whether the path is expected to be accepted or denied.
     * @return {boolean} Whether the path passes the gitignore filters or not.
     */
    accepts(input: string, expected?: boolean | null): boolean;

    /**
     * Return TRUE when the given `input` path FAILS the gitignore filters,
     * i.e. when the given input path is ACCEPTED.
     *
     * Notes:
     * - you MUST postfix a input directory with '/' to ensure the gitignore
     *   rules can be applied conform spec.
     * - you MAY prefix a input directory with '/' when that directory is
     *   'rooted' in the same directory as the compiled .gitignore spec file.
     *
     * @param {string} input The path to inspect.
     * @param {boolean | null} expected Whether the path is expected to be accepted or denied.
     * @return {boolean} Whether the path fails the gitignore filters or not.
     */
    denies(input: string, expected?: boolean | null): boolean;

    /**
     * Return TRUE when the given `input` path is inspected by any .gitignore
     * filter line.
     *
     * You can use this method to help construct the decision path when you
     * process nested .gitignore files: .gitignore filters in subdirectories
     * MAY override parent .gitignore filters only when there's actually ANY
     * filter in the child .gitignore after all.
     *
     * Notes:
     * - you MUST postfix a input directory with '/' to ensure the gitignore
     *   rules can be applied conform spec.
     * - you MAY prefix a input directory with '/' when that directory is
     *   'rooted' in the same directory as the compiled .gitignore spec file.
     *
     * @param {string} input The path to inspect.
     * @param {boolean | null} expected Whether the path is expected to be accepted or denied.
     * @return {boolean} i the path is inspected by any .gitignore filter line nor not.
     */
    inspects(input: string, expected?: boolean | null): boolean;
  }

  /**
   * Compile the given `.gitignore` content (not filename!)
   * and return an object with `accepts`, `denies` and `inspects` methods.
   * These methods each accepts a single filename or path and determines whether
   * they are acceptable or unacceptable according to the `.gitignore` definition.
   *
   * @param  {string} content The `.gitignore` content to compile.
   * @return {GitIgnoreHelper} The helper object with methods that operate on the compiled content.
   */
  export function compile(content: string): GitIgnoreHelper;

  /**
   * Parse the given `.gitignore` content and return an array
   * containing positives and negatives.
   * Each of these in turn contains a regexp which will be
   * applied to the 'rooted' paths to test for *deny* or *accept*
   * respectively.
   *
   * @param  {string} content The content to parse.
   * @return {Array<[RegExp, RegExp[]]>} The parsed positive and negatives definitions.
   */
  export function parse(content: string): Array<[RegExp, RegExp[]]>;
}
