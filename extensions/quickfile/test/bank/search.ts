import faker from "@faker-js/faker";
import { allBankTypes } from "../../src/api/bank";

export default () => ({
  Bank_Search: {
    Header: { MessageType: "Response", SubmissionNumber: "96c84e5a-d638-43eb-9bb7-21e9ef07e756" },
    Body: {
      MetaData: {
        RecordsetCount: 20,
        ReturnCount: 20,
        BankName: faker.finance.accountName(),
        BankType: faker.helpers.arrayElement(allBankTypes),
        AccountNo: faker.finance.account(),
        SortCode: faker.finance.account(),
        Currency: faker.helpers.arrayElement(["GBP", "EUR", "USD"]),
        CurrentBalance: (Math.random() - 0.5) * Math.pow(10, Math.floor(Math.random() * 10)),
      },
      Transactions: {
        Transaction: Array.from({ length: 20 }).map(() => ({
          TransactionDate: faker.date.past().toISOString(),
          Reference: faker.helpers.arrayElement([
            `Purchase of ${faker.commerce.productAdjective().toLowerCase()} ${faker.commerce.product().toLowerCase()}`,
            `Payment to ${faker.company.companyName()}`,
          ]),
          Amount: faker.finance.amount(),
          TagStatus: faker.helpers.arrayElement(["tagged", "untagged"]),
          TransactionId: faker.random.numeric(42),
        })),
      },
    },
  },
});
