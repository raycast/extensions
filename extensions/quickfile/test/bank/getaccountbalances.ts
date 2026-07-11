import faker from "@faker-js/faker";

export default {
  Bank_GetAccountBalances: {
    Header: { MessageType: "Response", SubmissionNumber: "688b517f-ddc5-421f-9ee8-f82653263032" },
    Body: {
      AccountBalances: [1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208].map((code) => ({
        NominalCode: code,
        Amount: faker.finance.amount(),
      })),
    },
  },
};
