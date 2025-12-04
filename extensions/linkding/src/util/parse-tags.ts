const parseTags = (tagString: string) => {
  const trimmed = tagString?.trim();
  return trimmed ? trimmed.split(/\s+/) : [];
};

export default parseTags;
