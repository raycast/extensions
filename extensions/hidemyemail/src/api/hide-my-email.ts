import axios, { AxiosRequestConfig } from "axios";
import { iCloudService, iCloudSession } from "./connect";
import { iCloudAPIResponseError } from "./errors";

interface IHideMyEmail {
  originAppName?: string;
  appIconUrl?: string;
  appBundleId?: string;
  origin: string;
  anonymousId: string;
  domain: string;
  forwardToEmail: string;
  hme: string;
  label: string;
  note: string;
  createTimestamp: number;
  isActive: boolean;
  recipientMailId: string;
}

export class HideMyEmail {
  id: string;
  address: string;
  label: string;
  note: string;
  forwardToEmail: string;
  origin: string;
  domain: string;
  appID?: string;
  appIconURL?: string;
  createTimestamp: number;
  isActive: boolean;

  constructor(hme: IHideMyEmail) {
    this.id = hme.anonymousId;
    this.address = hme.hme;
    this.label = hme.label;
    this.note = hme.note;
    this.domain = hme.domain;
    this.forwardToEmail = hme.forwardToEmail;
    this.createTimestamp = hme.createTimestamp;
    this.isActive = hme.isActive;

    switch (hme.origin) {
      case "ON_DEMAND":
        this.origin = "Hide My Email";
        this.appID = "default";
        break;
      case "SAFARI":
        this.origin = "Safari";
        this.appID = "com.apple.mobilesafari";
        break;
      case "MAIL":
        this.origin = "Mail";
        this.appID = "com.apple.mobilemail";
        break;
      case "IN_APP":
        this.origin = hme.originAppName!;
        if (hme.appBundleId) {
          this.appID = hme.appBundleId;
        }
        break;
      default:
        this.origin = hme.origin;
    }
  }
}

export async function getIcon(hme: HideMyEmail) {
  try {
    const response = await axios.get(`https://itunes.apple.com/search?term=${hme.origin}&limit=3&entity=software`);
    for (const entry of response.data.results) {
      if (entry.bundleId === hme.appID) {
        return entry.artworkUrl512;
      }
    }
  } catch (error) {
    return "";
  }
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

    if (!response.data.result?.hmeEmails) return [];
    const rawEmails = response.data.result?.hmeEmails;
    const emails = [];
    for (const hme of rawEmails) {
      emails.push(new HideMyEmail(hme));
    }
    return emails;
  }

  async toggleActive(email: HideMyEmail, toggle: AllowedValues, axiosConfig: AxiosRequestConfig = {}) {
    const endPoint = `${this.emailEndpointUpdate}/` + toggle;
    const data = { anonymousId: email.id };

    const response = await this.session.request("post", endPoint, { data, ...axiosConfig }, false);
    if (response.data.success === false) {
      console.log("Changing email status failed: ", response.data);
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error.errorCode);
    }
  }

  async updateMetaData(email: HideMyEmail, newMetaData: MetaData, axiosConfig: AxiosRequestConfig = {}) {
    const endPoint = `${this.emailEndpointUpdate}/updateMetaData`;
    const data = { anonymousId: email.id, ...newMetaData };
    const response = await this.session.request("post", endPoint, { data, ...axiosConfig }, false);

    if (response.data.success === false) {
      console.log("Updating meta data failed: ", response.data);
      throw new iCloudAPIResponseError(response.data.error.errorMessage, response.data.error.errorCode);
    }
  }

  async deleteAddress(email: HideMyEmail, axiosConfig: AxiosRequestConfig = {}) {
    if (email.isActive) await this.toggleActive(email, "deactivate");

    const endPoint = `${this.emailEndpointUpdate}/delete`;
    const data = { anonymousId: email.id };

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

    const hme = response.data.result["hme"];
    return hme;
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
