export interface Data {
  results: Call[];
  paging: Paging;
}

export interface Call {
  id: string;
  properties: Properties;
}

export interface Properties {
  createdate: string;
  hs_call_body: string;
  hs_call_duration: string;
  hs_call_from_number: string;
  hs_call_recording_url: string;
  hs_call_status: string;
  hs_call_title: string;
  hs_call_to_number: string;
  hs_lastmodifieddate: string;
  hs_timestamp: string;
  hubspot_owner_id: string;
}

export interface Paging {
  next: Next;
}

export interface Next {
  after: string;
  link: string;
}
