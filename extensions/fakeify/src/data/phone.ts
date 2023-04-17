import { PhoneFormats } from "../types";
import { PHONE_FORMATS } from "../formats";

export const getRandomPhoneNumber = (format: string) => {
  //console.log(format);
  const phoneFormat = PHONE_FORMATS[format as keyof PhoneFormats];
  let phoneNbr: string = phoneFormat?.base[Math.floor(Math.random() * phoneFormat?.base?.length)];
  let iterations: number = phoneFormat?.format?.length;

  for (let f of phoneFormat?.format) {
    const tmpNbrs = Array.from({ length: f }, () => Math.floor(Math.random() * 10));
    phoneNbr += !--iterations ? tmpNbrs?.join("") : tmpNbrs?.join("") + phoneFormat?.separator;
  }

  return phoneNbr;
};
