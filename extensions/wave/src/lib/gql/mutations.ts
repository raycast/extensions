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

const createProductOrService = `
    mutation ($input: ProductCreateInput!) {
        productCreate(input: $input) {
            didSucceed
            product {
                name
            }
        }
    }
`;

export const MUTATIONS = {
  createCustomer,
  deleteCustomer,
  createProductOrService,
};
