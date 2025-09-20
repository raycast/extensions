type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  nickName: string;
  phoneNumbers: { value: string; isMobile: boolean }[];
  emailAddresses: { value: string; isMobile?: never }[];
};

declare module "swift:*/contacts" {
  const fetchAllContacts: () => Promise<Contact[]>;
  export { fetchAllContacts };
}
