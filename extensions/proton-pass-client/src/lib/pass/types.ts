export type Vault = {
  title: string;
  id: string;
};

// Discriminated union item types
export type BaseItem = {
  title: string;
  id: string;
  vaultId: string;
  vaultTitle?: string;
  state: "Active" | "Trashed";
};

export type LoginItem = BaseItem & {
  type: "Login";
  email?: string;
  username?: string;
  password?: string;
  urls?: string[];
};

export type IdentityItem = BaseItem & {
  type: "Identity";
  full_name?: string;
  email?: string;
  phone_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  birthdate?: string;
  gender?: string;
  extra_personal_details?: string[];
  organization?: string;
  street_address?: string;
  zip_or_postal_code?: string;
};

export type CreditCardItem = BaseItem & {
  type: "CreditCard";
  cardholder_name?: string;
  card_type?: string;
  number?: string;
  verification_number?: string;
  expiration_date?: string;
};

export type SSHKeyItem = BaseItem & {
  type: "SSHKey";
  private_key?: string;
  public_key?: string;
};

export type Item = LoginItem | IdentityItem | CreditCardItem | SSHKeyItem;

// -- JSON

export type VaultsJson = { vaults: { name: string; vault_id: string }[] };
export type ItemsJson = {
  items: {
    id: string;
    vault_id: string;
    state: "Active" | "Trashed";
    content: {
      title: string;
      content: {
        Login?: {
          email?: string;
          username?: string;
          password?: string;
          urls?: string[];
        };
        Identity?: {
          full_name?: string;
          email?: string;
          phone_number?: string;
          first_name?: string;
          middle_name?: string;
          last_name?: string;
          birthdate?: string;
          gender?: string;
          extra_personal_details?: string[];
          organization?: string;
          street_address?: string;
          zip_or_postal_code?: string;
        };
        CreditCard?: {
          cardholder_name?: string;
          card_type?: string;
          number?: string;
          verification_number?: string;
          expiration_date?: string;
        };
        SshKey?: {
          private_key?: string;
          public_key?: string;
        };
      };
    };
  }[];
};
