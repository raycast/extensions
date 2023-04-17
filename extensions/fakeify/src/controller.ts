import { getRandomCountry, getRandomFullAddress, getRandomPostcode, getRandomStreet } from "./data/address";
import { getRandomDate } from "./data/date";
import { getRandomEmail } from "./data/email";
import { getRandomFirstname, getRandomLastname, getRandomName } from "./data/name";
import { getRandomPhoneNumber } from "./data/phone";
import { getRandomParagraph, getRandomParagraphs, getRandomStringId, getRandomId } from "./data/text";

type TypeToFunction = {
  [key: string]: (param?: any) => any;
};
type TMP_FIELD = {
  [key: string]: string;
};

const TYPE_TO_FUNCTION: TypeToFunction = {
  firstname: () => getRandomFirstname(),
  lastname: () => getRandomLastname(),
  name: () => getRandomName(),
  phone: (format: string) => getRandomPhoneNumber(format),
  email: (name?: any) => getRandomEmail(name),
  paragraph: () => getRandomParagraph(),
  paragraphs: (nbr: number) => getRandomParagraphs(nbr),
  date: (format: string) => getRandomDate(format),
  fullAddress: () => getRandomFullAddress(),
  postcode: () => getRandomPostcode(),
  street: () => getRandomStreet(),
  country: () => getRandomCountry(),
  stringId: (maxLength: number) => getRandomStringId(maxLength),
  id: (maxLength: number) => getRandomId(maxLength),
};

const flattenObject = (obj: any) => {
  const flattened: any = [];

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      flattened?.push(flattenObject(value));
    } else {
      flattened.push(value);
    }
  });

  return flattened;
};

export const getData = (req: any) => {
  let fieldNbr = req?.body?.fieldNbr;
  let fields = [];
  let name = {};
  console.log(req?.body?.data);

  for (let i = 0; i < fieldNbr; i++) {
    name = {
      firstname: TYPE_TO_FUNCTION["firstname"](),
      lastname: TYPE_TO_FUNCTION["lastname"](),
    };

    let tmpField: TMP_FIELD = {};
    for (let field of req?.body?.data) {
      if (field?.type === "email") {
        tmpField[field?.name] = TYPE_TO_FUNCTION[field?.type](name);
      } else if (field?.type === "firstname") {
        //@ts-ignore
        tmpField[field?.name] = name?.firstname;
      } else if (field?.type === "lastname") {
        //@ts-ignore
        tmpField[field?.name] = name?.lastname;
      } else if (field?.format) {
        tmpField[field?.name] = TYPE_TO_FUNCTION[field?.type](field?.format);
      } else if (field?.maxLength) {
        tmpField[field?.name] = TYPE_TO_FUNCTION[field?.type](field?.maxLength);
      } else if (field?.nbrOfP) {
        tmpField[field?.name] = TYPE_TO_FUNCTION[field?.type](field?.nbrOfP);
      } else if (field?.type === "fullAddress" && req?.body?.extension === "csv") {
        tmpField[field?.name] = flattenObject(TYPE_TO_FUNCTION[field?.type]());
      } else {
        tmpField[field?.name] = TYPE_TO_FUNCTION[field?.type]();
      }
    }
    fields.push(tmpField);
  }
  return fields;
};
