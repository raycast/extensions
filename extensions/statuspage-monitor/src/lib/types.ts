export interface Page {
  page: {
    id: string;
    name: string;
    time_zone: string;
    updated_at: string;
    url: string;
  };
}

export interface Status extends Page {
  status: {
    description: string;
    indicator: string;
  };
}
