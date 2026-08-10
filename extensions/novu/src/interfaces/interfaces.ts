export interface IFormData {
  requestDomain: string;
  notificationIdentifier: string;
  subscriberId: string;
  apiKey: string;
  payload: string;
}

export interface ITriggerPayload {
  name: string;
  to: string;
  payload: string;
}
