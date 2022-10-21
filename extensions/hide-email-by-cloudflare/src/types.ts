/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace HideEmailCloudflare {
    export interface Preferences {
      zoneID: string;
      accountID: string;
      token: string;
      email: string;
    }

    type matchersItem = {
      type: string;
      field: string;
      value: string;
    };

    type actionsItem = {
      type: string;
      value: Array<string>;
    };

    export interface Result {
      tag: string;
      name: string;
      priority: number;
      enabled: boolean;
      matchers: Array<matchersItem>;
      actions: Array<actionsItem>;
    }

    export interface RuleRes {
      success: boolean;
      errors: any[];
      messages: any[];
      result: Array<Result>;
      result_info: {
        page: number;
        per_page: number;
        count: number;
        total_count: number;
      };
    }

    export interface ListDestinationAddressesRes {
      success: boolean;
      errors: any[];
      messages: any[];
      result: [
        {
          tag: string;
          email: string;
          verified: string;
          created: string;
          modified: string;
        }
      ];
    }

    export interface GetEmailDomainRes {
      success: boolean;
      errors: any[];
      messages: any[];
      result: {
        tag: string;
        name: string;
        enabled: boolean;
        created: string;
        modified: string;
        skip_wizard: boolean;
        status: string;
      };
    }
  }
}
