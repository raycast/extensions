interface GetALLModelResponse {
  success: boolean;
  result: Result[];
  errors: unknown;
  messages: string | unknown;
  result_info: ResultInfo;
}

interface Result {
  id: string;
  source: number;
  name: string;
  description: string;
  task: Task;
  created_at: Date;
  tags: string[];
  properties: Property[];
}

interface Property {
  property_id: string;
  value: ValueElement[] | string;
}

interface ValueElement {
  unit: string;
  price: number;
  currency: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
}

interface ResultInfo {
  count: number;
  page: number;
  per_page: number;
  total_count: number;
}

export type { GetALLModelResponse, Result, Property, ValueElement, Task, ResultInfo };
