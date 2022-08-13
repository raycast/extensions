declare module "splitwise" {
  // "apartment" "house" "trip" "other"
  export enum GroupType {
    APARTMENT = "APARTMENT",
    HOUSE = "HOUSE",
    TRIP = "TRIP",
    Other = "other",
  }

  export type Member = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    // registration_status: "confirmed" | "pending" | "rejected";
    picture: {
      small: string;
      medium: string;
      large: string;
    };
    balance: {
      currency_code: string;
      amount: string;
    }[];
  };

  export type Debt = {
    from: number;
    to: number;
    amount: string;
    currency_code: string;
  };

  export type Group = {
    id: number;
    name: string;
    group_type: GroupType;
    updated_at: string;
    simplify_by_default: boolean;
    members: Member[];
    original_debts: Debt[];
    simplified_debts: Debt[];
    avatar: {
      original: string;
      xxlarge: string;
      xlarge: string;
      large: string;
      medium: string;
      small: string;
    };
    custom_avatar: boolean;
    cover_photo: {
      xxlarge: string;
      xlarge: string;
    };
    invite_link: string;
  };

  type SplitwiseContructorOptions = {
    consumerKey: string;
    consumerSecret: string;
  };

  type SplitwiseClient = {
    getCurrentUser(): Promise<unknown>;
    getGroups(): Promise<Group[]>;
  };

  function Splitwise(options: SplitwiseContructorOptions): SplitwiseClient;
  export = Splitwise;
  export default Splitwise;
}
