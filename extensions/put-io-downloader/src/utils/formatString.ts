const formatString = (str: string, ...val: string[]) => {
  for (let index = 0; index < val.length; index++) {
    str = str.replace(`{${index}}`, val[index]);
  }
  return str;
};
export default formatString;
