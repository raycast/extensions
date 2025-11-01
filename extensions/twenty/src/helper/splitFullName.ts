export const splitFullName = (name: string) => {
  const splittedName = name.trim().split(/\s+/);

  if (splittedName.length === 2) {
    return {
      firstName: splittedName[0],
      lastName: splittedName[1],
    };
  }

  if (splittedName.length > 2) {
    return { firstName: splittedName[0].trim(), lastName: splittedName[1].trim() };
  }

  return { firstName: name.trim(), lastName: "" };
};
