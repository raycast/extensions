import firstnames from "../../lists/firstnames.json";
import lastnames from "../../lists/lastnames.json";

export const getRandomFirstname = () => {
  const firstname = firstnames[Math.floor(Math.random() * firstnames.length)];
  return firstname;
};
export const getRandomLastname = () => {
  const lastname = lastnames[Math.floor(Math.random() * lastnames.length)];
  return lastname;
};
export const getRandomName = () => {
  const name =
    firstnames[Math.floor(Math.random() * firstnames.length)] +
    " " +
    lastnames[Math.floor(Math.random() * lastnames.length)];
  return name;
};
