type Env = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_API_KEY: string;
  ALGOLIA_INDICES: { key: string; name: string }[];
  SPRYKER_DOCS_URL: string;
};

export const ENV: Env = {
  ALGOLIA_APP_ID: "IBBSSFT6M1",
  ALGOLIA_API_KEY: "296ac9c40fa95441b2d89d1fd8395bb4",
  ALGOLIA_INDICES: [
    { key: "scos_dev", name: "SCOS Developer" },
    { key: "scos_user", name: "SCOS User" },
    { key: "pbc_all", name: "Packaged Business Capabilities" },
    { key: "marketplace_user", name: "Marketplace User" },
    { key: "marketplace_dev", name: "Marketplace Developer" },
    { key: "sdk_dev", name: "SDK Developer" },
    { key: "cloud_dev", name: "Cloud Developer" },
    { key: "acp_user", name: "ACP User" },
    { key: "scu_dev", name: "SCU Developer" },
  ],
  SPRYKER_DOCS_URL: "https:docs.spryker.com",
};
