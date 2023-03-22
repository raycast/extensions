import { filter } from "../configs";
import { difference, union } from "./core";

function filterString(str: string): string[] {
  const strArr = str.toLowerCase();

  return difference(strArr.split(" "), union(filter.prep, filter.prefix, filter.suffix, filter.verb));
}

/**
 * 大驼峰
 *
 * @param {string} s
 * @return {*}
 */
export function bigHump(s: string): string {
  const strArr = filterString(s);
  strArr[0] = strArr[0].charAt(0).toUpperCase() + strArr[0].substring(1);

  for (let i = 1; i < strArr.length; i++) {
    strArr[i] = strArr[i].charAt(0).toUpperCase() + strArr[i].substring(1);
  }

  return strArr.join("");
}

/**
 * 小驼峰
 *
 * @param {string} s
 * @return {*}  {string}
 */
export function hump(s: string): string {
  const strArr = filterString(s);

  for (let i = 1; i < strArr.length; i++) {
    strArr[i] = strArr[i].charAt(0).toUpperCase() + strArr[i].substring(1);
  }
  return strArr.join("");
}

/**
 * 命名常量
 *
 * @param {string} s
 * @return {*}  {string}
 */
export function namedConst(s: string): string {
  const strArr = filterString(s);
  for (let i = 0; i < strArr.length; i++) {
    strArr[i] = strArr[i].toUpperCase();
  }

  return strArr.join("_");
}

/**
 * 下划线
 *
 * @param {string} s
 * @return {*}  {string}
 */
export function underline(s: string): string {
  const strArr = filterString(s);
  for (let i = 0; i < strArr.length; i++) {
    strArr[i] = strArr[i].toLowerCase();
  }

  return strArr.join("_");
}

/**
 * 中划线
 *
 * @param {string} s
 * @return {*}  {string}
 */
export function hyphen(s: string): string {
  const strArr = filterString(s);
  for (let i = 0; i < strArr.length; i++) {
    strArr[i] = strArr[i].toLowerCase();
  }

  return strArr.join("-");
}
