import { EMAIL_PROVIDERS } from "../formats";
import { getRandomFirstname, getRandomLastname } from "./name";

type randomEmailProps = {
  firstname: string;
  lastname: string;
};

export const getRandomEmail = (name?: randomEmailProps) => {
  let email = "";
  let prefix;

  if (name) {
    prefix = [name?.firstname, name?.lastname];
  } else {
    prefix = [getRandomFirstname(), getRandomLastname()];
  }
  email +=
    prefix
      .splice(Math.floor(Math.random() * 2), 1)
      .toString()
      .toLowerCase() + ".";

  email += `${prefix[0].toString().toLowerCase()}@${
    EMAIL_PROVIDERS[Math.floor(Math.random() * EMAIL_PROVIDERS.length)]
  }.com`;
  return email;
};
