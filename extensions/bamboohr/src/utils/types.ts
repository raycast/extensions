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

export interface EmployeeProps {
  key: string;
  subtitle?: string;
  employee: EmployeeType | null | undefined;
}
