export type Label = {
          "id": string;
          "name": string;
          "description": string;
          "color": string;
          "createdAt": string;
          "updatedAt": string;
}
export type CreateLabelRequest = {
    name: string;
    description: string;
}
export type Item = {
    id: string;
    assetId: string;
    name: string;
    description: string;
    "quantity": number
    "insured": boolean
    "archived": boolean
    "createdAt": string
    "updatedAt": string
    "purchasePrice": number
    labels: Label[]
}
export type CreateItemRequest = {
    locationId: string;
    name: string;
    quantity: number
    description: string;
    labelIds: string[]
}

export type Location = {
    "id": string
    "name": string
    "description": string
    "createdAt": string
    "updatedAt": string
    "itemCount": number
}