const createCustomer = `
    mutation ($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
            didSucceed
        }
    }
`;

const deleteCustomer = `
    mutation ($input: CustomerDeleteInput!) {
        customerDelete(input: $input) {
            didSucceed
        }
    }
`;

export const MUTATIONS = {
  createCustomer,
  deleteCustomer,
};
