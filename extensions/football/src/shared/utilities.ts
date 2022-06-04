import isNil from 'lodash/isNil';

export const getScoreValue = (number: number | undefined) => {
  if (isNil(number)) return '';

  return number
    .toString()
    .replace(/0/g, '0️⃣')
    .replace(/1/g, '1️⃣')
    .replace(/2/g, '2️⃣')
    .replace(/3/g, '3️⃣')
    .replace(/4/g, '4️⃣')
    .replace(/5/g, '5️⃣')
    .replace(/6/g, '6️⃣')
    .replace(/7/g, '7️⃣')
    .replace(/8/g, '8️⃣')
    .replace(/9/g, '9️⃣');
};
