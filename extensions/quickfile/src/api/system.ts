import { post, QuickFileResponse } from ".";

export interface SystemGetAccountDetails {
  AccountDetails: {
    AccountNumber: string;
    CompanyName: string;
    CompanyNumber: string;
    ClientDomain: string;
    BusinessType: string;
    CountryIso: string;
    BaseCurrency: string;
    Tel: string;
    Web: string;
    VatRegNumber: string;
    YearEndDate: string;
    DailyDataTransferLimit: number;
    Address: string;
    TeamMembers: {
      TeamMember: Array<{
        FirstName: string;
        Surname: string;
        IsDefaultLogin: boolean;
        LastLogin?: string;
      }>;
    };
    BackupSchedule: {
      StartDate: string;
      Frequency: string;
      BackupType: string;
      EmailAddress: string;
    };
  };
}

export const systemGetAccountDetails = async <Field extends keyof SystemGetAccountDetails["AccountDetails"]>(
  accountNumber: string | number,
  fields: Array<Field>
): Promise<Pick<SystemGetAccountDetails["AccountDetails"], Field>> => {
  const { System_GetAccountDetails } = await post<{
    System_GetAccountDetails: QuickFileResponse<SystemGetAccountDetails>;
  }>("system/getaccountdetails", {
    AccountDetails: {
      AccountNumber: accountNumber,
      ReturnVariables: {
        Variable: fields,
      },
    },
  });
  return System_GetAccountDetails.Body.AccountDetails;
};
