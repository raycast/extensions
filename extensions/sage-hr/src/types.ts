export type Policy = {
  name: string;
};

export type Employee = {
  first_name: string;
  last_name: string;
  email?: string;
};

export type AbsenceRecord = {
  policy_id: number;
  policy: Policy;
  employee_id: number;
  employee: Employee;
  details: string;
  is_multi_date: boolean;
  is_single_day: boolean;
  is_part_of_day: boolean;
  first_part_of_day: boolean;
  second_part_of_day: boolean;
  start_date: string;
  end_date: string;
  hours: number;
};

export type AbsencesResponse = {
  data: AbsenceRecord[];
};
