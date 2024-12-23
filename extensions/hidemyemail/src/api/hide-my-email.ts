import { AxiosRequestConfig } from "axios";
import { iCloudService, iCloudSession } from "./connect";
import { iCloudAPIResponseError } from "./errors";

export interface HideMyEmail {
  origin: string;
  anonymousId: string;
  forwardToEmail: string;
  hme: string;
  label: string;
  note: string;
  createTimestamp: number;
  isActive: boolean;
  recipientMailId: string;
}

export interface MetaData {
  label: string;
  note: string;
}

type AllowedValues = "reactivate" | "deactivate";

export class HideMyEmailService {
  private service: iCloudService;
  private session: iCloudSession;
  private serviceRoot: string;
  private emailEndpointGet: string;
  private emailEndpointUpdate: string;

  constructor(serviceRoot: string, service: iCloudService, session: iCloudSession) {
    this.service = service;
    this.session = session;
    this.serviceRoot = serviceRoot;
    this.emailEndpointGet = `${this.serviceRoot}/v2/hme`;
    this.emailEndpointUpdate = `${this.serviceRoot}/v1/hme`;
  }

  isActive() {
    return this.service.dsInfo?.isHideMyEmailSubscriptionActive ?? false;
  }


  async getAllAdresses(axiosConfig: AxiosRequestConfig = {}) {
    const response = await this.session.request("get", `${this.emailEndpointGet}/list`, axiosConfig, false);

    if (response.data.success === false) {
      console.log("Failed to fetch addresses: ", response.data);
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error.errorCode);
    }
    return response.data.result?.hmeEmails;
  }

  async toggleActive(email: HideMyEmail, toggle: AllowedValues, axiosConfig: AxiosRequestConfig = {}) {
    const endPoint = `${this.emailEndpointUpdate}/` + toggle;
    const data = { anonymousId: email.anonymousId };

    const response = await this.session.request("post", endPoint, { data, ...axiosConfig }, false);
    if (response.data.success === false) {
      console.log("Changing email status failed: ", response.data);
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error.errorCode);
    }
  }

  async updateMetaData(email: HideMyEmail, newMetaData: MetaData, axiosConfig: AxiosRequestConfig = {}) {
    const endPoint = `${this.emailEndpointUpdate}/updateMetaData`;
    const data = { anonymousId: email.anonymousId, ...newMetaData };
    const response = await this.session.request("post", endPoint, { data, ...axiosConfig }, false);

    if (response.data.success === false) {
      console.log("Updating meta data failed: ", response.data);
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error.errorCode);
    }
  }

  async deleteAddress(email: HideMyEmail, axiosConfig: AxiosRequestConfig = {}) {
    if (email.isActive) await this.toggleActive(email, "deactivate");

    const endPoint = `${this.emailEndpointUpdate}/delete`;
    const data = { anonymousId: email.anonymousId };

    const response = await this.session.request("post", endPoint, { data, ...axiosConfig }, false);
    if (response.data.success === false) {
      console.log("Deleting address failed: ", response.data);
      if (email.isActive) await this.toggleActive(email, "reactivate");
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error?.errorCode);
    }
  }

  async generateAddress(axiosConfig: AxiosRequestConfig = {}) {
    const endPoint = `${this.emailEndpointUpdate}/generate`;

    const response = await this.session.request("post", endPoint, axiosConfig, false);
    if (response.data.success === false) {
      console.log("Generating address failed: ", response.data);
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error?.errorCode);
    }

    const address = response.data.result["hme"];
    return address;
  }

  async addAddress(address: string, metaData: MetaData, axiosConfig: AxiosRequestConfig = {}) {
    const endPoint = `${this.emailEndpointUpdate}/reserve`;
    const data = { hme: address, ...metaData };

    const response = await this.session.request("post", endPoint, { data, ...axiosConfig }, false);
    if (response.data.success === false) {
      console.log("Adding address failed: ", response.data);
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error?.errorCode);
    }
  }
}
