import { OBJECTS } from "./objects";

const Invoice = `
    id
    createdAt
    modifiedAt
    pdfUrl
    viewUrl
    status
    title
    subhead
    invoiceNumber
    invoiceDate
    customer {
        name
    }
    dueDate
    amountDue {
        value
        currency {
            code
            symbol
        }
    }
    amountPaid {
        value
        currency {
            symbol
        }
    }
    taxTotal {
        value
        currency {
            symbol
        }
    }
    total {
        value
        currency {
            symbol
        }
    }
    itemTitle
    unitTitle
    priceTitle
    amountTitle
    hideName
    hideDescription
    hideUnit
    hidePrice
    hideAmount
    items {
        product {
            id
            name
        }
        description
        quantity
        price
        subtotal {
            value
            currency {
            symbol
            }
        }
        total {
            value
            currency {
                symbol
            }
        }
    }
`;

export const NODES = {
  Customer: `
        id
        name
        firstName
        lastName
        email
        website
        phone
        currency {
            ${OBJECTS.Currency}
        }
        createdAt
        modifiedAt
        overdueAmount {
            raw
            value
        }
        outstandingAmount {
            raw
            value
        }
    `,
  Invoice,
  Product: `
        id
        name
        description
        unitPrice
    `,
};
