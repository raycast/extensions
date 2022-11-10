export const urlParser = (text: string): string | null => {
  const matchUrl = text.match(
    /https?:\/\/(www\.)?([-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b)([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g
  );

  if (matchUrl) {
    return matchUrl[0];
  } else {
    return null;
  }
};
