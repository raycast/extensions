export interface Preferences {
  bamboo_api_key: string;
  bamboo_subdomain: string;
  bamboo_user_id: string;
}

export interface EmployeeType {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null | undefined;
  jobTitle: string;
  workPhone: string | null;
  workEmail: string;
  department: string;
  location: string;
  division: string;
  linkedIn: string | null;
  pronouns: string | null;
  workPhoneExtension: string | null;
  supervisor: string;
  photoUploaded: boolean;
  photoUrl: string;
}
