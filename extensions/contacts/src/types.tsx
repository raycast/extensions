export type Contact = {
  firstName: string;
  lastName: string;
  emails: string[];
  phones: string[];
  id: string;
};

export type ContactGroup = {
  [key: string]: Contact[];
};
