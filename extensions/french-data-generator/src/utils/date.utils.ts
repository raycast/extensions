export const generateRandomDob = (minAge: number, maxAge: number): string => {
  const today = new Date();
  const startYear = today.getFullYear() - maxAge;
  const endYear = today.getFullYear() - minAge;
  const randomYear = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const randomMonth = Math.floor(Math.random() * 12);
  const randomDay = Math.floor(Math.random() * 28) + 1;
  const randomDate = new Date(randomYear, randomMonth, randomDay);
  return randomDate.toISOString().split("T")[0].split("-").reverse().join("/");
};

export const calculateAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob.split("/").reverse().join("-"));
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const isBeforeBirthday = today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (isBeforeBirthday) age -= 1;
  return age;
};
