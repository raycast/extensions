export const NameChecker = (string: string) => {
  let error = undefined;
  if (string.length === 0) error = "Your string is empty";
  return error;
};

export const ProjectChecker = (string: string) => {
  let error = undefined;
  if (string === undefined) error = "Your projects is empty";
  return error;
};

export const IconChecker = (string: string) => {
  let error = undefined;
  const regex = /\p{Extended_Pictographic}/gu;
  if (!regex.test(string)) error = "Your icon is not valid";
  return error;
};

export const UrlChecker = (url: string) => {
  let error = undefined;
  try {
    new URL(url);
  } catch (e) {
    error = "Your url is not valid";
  }
  return error;
};
