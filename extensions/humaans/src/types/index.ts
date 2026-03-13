export type Holiday = {
  id: string;
  startDate: string;
  endDate: string;
  personId: string;
  requestStatus: "pending" | "approved";
  name: string;
  type: string;
  days: number;
};

export type Person = {
  id: string;
  status: "active";
  profilePhoto: {
    variants: {
      "96": string;
    };
  };
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phoneNumber: string;
};

export type JobRole = {
  id: string;
  jobTitle: string;
  personId: string;
  department: string;
};
