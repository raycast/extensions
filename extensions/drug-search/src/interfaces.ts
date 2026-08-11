export interface Root {
  meta: Meta;
  results: Result[];
}

export interface Meta {
  disclaimer: string;
  terms: string;
  license: string;
  last_updated: string;
  results: Results;
}

export interface Results {
  skip: number;
  limit: number;
  total: number;
}

export interface Result {
  submissions: Submission[];
  application_number: string;
  sponsor_name: string;
  openfda: Openfda;
  products: Product[];
}

export interface Submission {
  submission_type: string;
  submission_number: string;
  submission_status: string;
  submission_status_date: string;
  review_priority?: string;
  submission_class_code?: string;
  submission_class_code_description?: string;
  application_docs?: ApplicationDoc[];
}

export interface ApplicationDoc {
  id: string;
  url: string;
  date: string;
  type: string;
}

export interface Openfda {
  application_number: string[];
  brand_name: string[];
  generic_name: string[];
  manufacturer_name: string[];
  product_ndc: string[];
  product_type: string[];
  rxcui: string[];
  spl_id: string[];
  spl_set_id: string[];
  package_ndc: string[];
}

export interface Product {
  product_number: string;
  reference_drug: string;
  brand_name: string;
  active_ingredients: ActiveIngredient[];
  reference_standard: string;
  dosage_form: string;
  route: string;
  marketing_status: string;
}

export interface ActiveIngredient {
  name: string;
  strength: string;
}
