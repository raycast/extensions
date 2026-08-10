/**
 * Returns `true` if the string is all whitespace, else returns `false`
 *
 * @remark Original {@link https://github.com/plotly/is-string-blank/blob/master/index.js source on GitHub}
 */
function isStringBlank(str: string): boolean {
  const l = str.length;
  let a: number;
  for (let i = 0; i < l; i++) {
    a = str.charCodeAt(i);
    if (
      (a < 9 || a > 13) &&
      a !== 32 &&
      a !== 133 &&
      a !== 160 &&
      a !== 5760 &&
      a !== 6158 &&
      (a < 8192 || a > 8205) &&
      a !== 8232 &&
      a !== 8233 &&
      a !== 8239 &&
      a !== 8287 &&
      a !== 8288 &&
      a !== 12288 &&
      a !== 65279
    ) {
      return false;
    }
  }
  return true;
}

export default isStringBlank;
