/**
 * 用于比较两个数组并返回差异（即仅存于第一个数组中的元素）的新数组
 *
 * difference([1,2,3], [2,4]) // [1,3]
 *
 * @param {T[]} array 要检查的源数组
 * @param {T[]} values 要排除的数组或值
 * @return {*}  {T[]} 返回的新数组包含仅存在于 array 中但不存在于 [values] 中的元素
 */
export function difference<T>(array: T[], values: T[]): T[] {
  return array.filter((x) => !values.includes(x));
}

/**
 * 去重并返回合并后的数组
 *
 * @param {...T[][]} arrays
 * @return {*}  {T[]}
 */
export function union<T>(...arrays: T[][]): T[] {
  const merged = arrays.reduce((acc, arr) => acc.concat(arr), []);

  return Array.from(new Set<T>(merged));
}

/**
 * 随机从数组中选出一个
 *
 * @param {T[]} collection
 * @return {*}
 */
export function sample<T>(collection: T[]) {
  if (Array.isArray(collection)) {
    return collection[Math.floor(Math.random() * collection.length)];
  } else {
    const keys = Object.keys(collection);
    return collection[keys[Math.floor(Math.random() * keys.length)]];
  }
}
