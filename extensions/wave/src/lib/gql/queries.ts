import { NODES } from "./nodes";
import { OBJECTS } from "./objects";

export const queryGetCustomerOutstandingInvoicesCustomerStatement = `
    query($businessId: ID!, $customerId: ID!) {
        business(id: $businessId) {
            invoices(customerId: $customerId, sort: [INVOICE_DATE_ASC]) {
                edges {
                    node {
                        ${NODES.Invoice}
                    }
                }
            }
        }
    }
`;

export const QUERIES = {
  getBusinesses: `
    query {
        businesses {
            edges {
                node {
                    id
                    name
                    isPersonal
                    modifiedAt
                    currency {
                        code
                    }
                }
            }
        }
    }
    `,
  getBusinessInvoices: `
    query($businessId: ID!) {
        business(id: $businessId) {
            invoices {
                edges {
                    node {
                        ${NODES.Invoice}
                    }
                }
            }
        }
    }
    `,
  getBusinessCustomers: `
    query($businessId: ID!) {
        business(id: $businessId) {
            id
            customers {
            edges {
                node {
                    ${NODES.Customer}
                }
            }
        }
    }
}
`,
  getProducts: `
    query($businessId: ID!) {
        business(id: $businessId) {
            currency {
                ${OBJECTS.Currency}
            }
            products {
                edges {
                    node {
                        ${NODES.Product}
                    }
                }
            }
        }
    }`,
  getCurrencies: `
        query {
            currencies {
                ${OBJECTS.Currency}
            }
        }
    `,
  getCountries: `
        query {
            countries {
                code
                name
            }
        }
    `,
  getValidIncomeAccounts: `
        query ($businessId: ID!, $subtypes: [AccountSubtypeValue!]) {
            business(id: $businessId) {
                id
                accounts(subtypes: $subtypes) {
                    edges {
                        node {
                            id
                            name
                            subtype {
                                name
                                value
                            }
                        }
                    }
                }
            }
        }
    `,
};
