export type CountriesResponse = {
  [key: string]: {
    country_name: string;
    dialling_code: string;
  };
};

export type ValidateNumberResponse = {
  valid: boolean;
  number: string;
  local_format: string;
  international_format: string;
  country_prefix: string;
  country_code: string;
  country_name: string;
  location: string;
  carrier: string;
  line_type: string;
};

export type ErrorResponse = {
  message: string;
};
