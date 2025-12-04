export const getBlur = (blur: string): number => {
  let _blur = parseFloat(blur);
  if (isNaN(_blur) || _blur < 0) {
    _blur = 0;
  }
  if (_blur > 10) {
    _blur = 10;
  }
  return _blur;
};
