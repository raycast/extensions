export type ErrorResponse = {
  success: false;
  error: {
    code: number;
    type: string;
    info: string;
  };
};

export type ValidateVATNumberResponse = {
  valid: boolean;
  database: "ok" | "failure";
  format_valid: boolean;
  query: string;
  country_code: string;
  vat_number: string;
  company_name: string;
  company_address: string;
};
type GetVATRatesViaXYZResponse = {
  success: true;
  country_code: string;
  country_name: string;
  standard_rate: number;
  reduced_rates: {
    [key: string]: number;
  };
};
export type GetVATRatesViaCountryCodeResponse = GetVATRatesViaXYZResponse;
export type GetVATRatesViaIPAddressResponse = GetVATRatesViaXYZResponse;
export type GetVATRatesViaClientIPResponse = GetVATRatesViaXYZResponse;
export type GetAllVATRatesResponse = {
  success: true;
  rates: {
    [key: string]: {
      country_name: string;
      standard_rate: number;
      reduced_rates: {
        [key: string]: number;
      };
    };
  };
};

export type GetTypesOfGoodsResponse = {
  success: true;
  types: string[];
};

export type CalculateVATCompliantPriceResponse = {
  success: true;
  country_code: string;
  country_name: string;
  price_excl_vat: number;
  price_incl_vat: number;
  type?: string;
  vat_rate: number;
};
