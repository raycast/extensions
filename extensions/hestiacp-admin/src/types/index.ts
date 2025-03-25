// IPs
export type ListUserIPsResponse = {
  [key: string]: {
    OWNER: string;
    STATUS: string;
    NAME: string;
    NAT: string;
  };
};

export type ErrorResponse = {
  error: true;
};
