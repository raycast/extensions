export type NifRecord = {
  taxId: number;
  companyName: string;
  registrationStatus: string;
  activityDescription: string | null;
  startDate: string | null;
  contactChannels: {
    primaryEmail: string | null;
    primaryPhone: string | null;
    webUrl: string | null;
    fax: string | null;
    link_website_completo: string | null;
  };
  headquartersLocation: {
    addressLine: string;
    zipCodePart4: string;
    zipCodePart3: string;
    city: string;
    fullMapAddress: string;
  };
  apiMetadata: {
    seoSlug: string;
    caeList: string;
    legalRegime: string;
    shareCapital: string;
    raciusLink: string;
  };
};

export type NifResponse = NifRecord | NifRecord[];
