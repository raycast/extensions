import fetch from "node-fetch";

import { IOrganizationError } from "./IOrganizationError";
import { GitpodDataModel } from "./Model";

const organizationURLs = {
  getOrganizations: "https://api.gitpod.io/gitpod.experimental.v1.TeamsService/ListTeams",
};

export class IOrganization implements GitpodDataModel {
  private token: string;
  public orgId: string;
  public name: string;
  public slug: string;

  constructor(organization: any, token: string) {
    this.orgId = organization.id;
    this.name = organization.name;
    this.slug = organization.slug;

    this.token = token;
  }

  parse(json: string): IOrganization {
    const data = JSON.parse(json);

    this.orgId = data.id ?? "";
    this.name = data.name ?? "";
    this.slug = data.slug ?? "";

    return this;
  }

  static fetchOrganization = async (token: string): Promise<IOrganization[]> => {
    const organizations: IOrganization[] = [];
    const response = await fetch(organizationURLs.getOrganizations, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (response.status !== 200) {
      const error: IOrganizationError = {
        name: "OrganizationFetchError",
        code: response.status,
        message: response.statusText,
      };
      throw error;
    }

    const json = (await response.json()) as any;

    json.teams.map((organization: unknown) => {
      const org = new IOrganization(organization, token);
      organizations.push(org);
    });

    return organizations;
  };
}
