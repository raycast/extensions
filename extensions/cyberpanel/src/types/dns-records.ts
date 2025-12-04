export type DNSRecord = {
  id: number;
  type: string;
  name: string;
  content: string;
  priority: number;
  ttl: number;
};
export type ListDNSRecordsInDomainRequest = {
  selectedZone: string;
  currentSelection: string;
};
export type ListDNSRecordsInDomainResponse = {
  status: 1;
  fetchStatus: 1;
  error_message: "None";
  data: DNSRecord[] | string;
};

export type CreateDNSRecordFormValues = {
  selectedZone: string;
  recordName: string;
  ttl: string;
  recordType: string;
  priority?: string;
  recordContentA?: string;
  recordContentAAAA?: string;
  recordContentCNAME?: string;
  recordContentMX?: string;
  recordContentTXT?: string;
  recordContentSPF?: string;
  recordContentNS?: string;
  recordContentSOA?: string;
  recordContentSRV?: string;
  recordContentCAA?: string;
};
export type CreateDNSRecordRequest = {
  selectedZone: string;
  recordName: string;
  ttl: number;
  recordType: string;
  priority?: number;
  recordContentA?: string;
  recordContentAAAA?: string;
  recordContentCNAME?: string;
  recordContentMX?: string;
  recordContentTXT?: string;
  recordContentSPF?: string;
  recordContentNS?: string;
  recordContentSOA?: string;
  recordContentSRV?: string;
  recordContentCAA?: string;
};
export type CreateDNSRecordResponse = {
  status: 1;
  add_status: 1;
  error_message: "None";
};

export type DeleteDNSRecordRequest = {
  id: number;
};
export type DeleteDNSRecordResponse = {
  status: 1;
  delete_status: 1;
  error_message: "None";
};

export type DNSRecordRequestBody = ListDNSRecordsInDomainRequest | CreateDNSRecordRequest | DeleteDNSRecordRequest;
export type DNSRecordSuccessResponse =
  | ListDNSRecordsInDomainResponse
  | CreateDNSRecordResponse
  | DeleteDNSRecordResponse;
