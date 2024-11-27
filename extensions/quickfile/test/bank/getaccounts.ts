import faker from "@faker-js/faker";
import { allBankTypes } from "../../src/api/bank";

const logoPaths = [
  "acorn.png",
  "aldermore.png",
  "monzo.png",
  "transferwise.png",
  "barclaycard.png",
  "transferwise.png",
  "amex.png",
  "halifax.png",
  "lloyds.png",
  "natwest.png",
];

export default {
  Bank_GetAccounts: {
    Header: {
      MessageType: "Response",
      SubmissionNumber: "ce7b7add-ced4-458d-9d50-49fbe1c87a8d",
    },
    Body: {
      BankAccounts: [1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208].map((code) => ({
        BankId: faker.finance.account(),
        Name: faker.finance.accountName(),
        NominalCode: code,
        BankType: faker.helpers.arrayElement(
          allBankTypes.filter((i) => !["PETTY", "BUILDINGSOC", "MERCHANT", "EQUITY", "RESERVE"].includes(i))
        ),
        IsDefaultAccount: false,
        LogoPath: faker.helpers.arrayElement(logoPaths),
        IsHidden: false,
        OpenBankingConsents: faker.helpers.arrayElement([
          undefined,
          undefined,
          undefined,
          [{ BankName: faker.finance.accountName(), ExpiryDate: faker.date.soon().toISOString() }],
        ]),
      })),
    },
  },
};
