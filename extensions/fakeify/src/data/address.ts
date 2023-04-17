const fullAddresses = require("../../lists/fullAddresses.json");
const countries = require("../../lists/countries.json");

const randomFullAddress = () => {
  const address = fullAddresses.addresses[Math.floor(Math.random() * fullAddresses.addresses.length)];
  return address;
};

export const getRandomFullAddress = () => {
  const address = randomFullAddress();
  return address;
};
export const getRandomCountry = () => {
  const country = countries[Math.floor(Math.random() * countries.length)];
  return country;
};
export const getRandomPostcode = () => {
  const postcode = randomFullAddress().postalCode;
  return postcode;
};
export const getRandomStreet = () => {
  const street = randomFullAddress().address1;
  return street;
};
