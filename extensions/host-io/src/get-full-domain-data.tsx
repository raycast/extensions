import { Detail, getPreferenceValues, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type DNS = {
  domain: string;
  a?: string[];
  aaaa?: string;
  mx?: string;
  ns?: string;
};
type IPInfo = {
  [ip: string]: {
    city?: string;
    region?: string;
    country?: string;
    loc?: string;
    postal?: string;
    timezone?: string;
    asn: {
      asn: string;
      name: string;
      domain: string;
      route: string;
      type: string;
    };
  };
};
type Web = {
  domain: string;
  rank: number;
  url: string;
  ip: string;
  date: string;
  length: number;
  server: string;
  powered_by?: string;
  encoding: string;
  twitter?: string;
  title: string;
  description: string;
  email?: string;
  links: string[];
};
type RelatedItem = {
  value?: string;
  count: number;
};

type Result = {
  domain: string;
  dns: DNS | Record<string, never>;
  ipinfo: IPInfo | Record<string, never>;
  web: Web | Record<string, never>;
  related: {
    backlinks: RelatedItem[];
    redirects: RelatedItem[];
    ip?: RelatedItem[];
    asn?: RelatedItem[];
    mx?: RelatedItem[];
    ns?: RelatedItem[];
    email?: RelatedItem[];
  };
};

export default function GetFullDomainData(props: LaunchProps<{ arguments: Arguments.GetFullDomainData }>) {
  const { token } = getPreferenceValues<Preferences>();
  const { domain } = props.arguments;
  const { isLoading, data } = useFetch(`https://host.io/api/full/${domain}?token=${token}`, {
    async parseResponse(response) {
      const result = await response.json();
      if (!response.ok) {
        const err = result as { error: string; title?: string };
        throw new Error(err.error);
      }
      return result as Result;
    },
  });
  const markdown = !data
    ? ""
    : `
|  |  |
|--|--|
${Object.entries(data.web)
  .map(([key, val]) => `| ${key} | ${val} |`)
  .join(`\n`)}
`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={`Domain: ${domain} \n\n --- ${markdown}`}
      metadata={
        data && (
          <Detail.Metadata>
            {Object.entries(data.related).map(([key, vals]) => (
              <Detail.Metadata.TagList key={key} title={key}>
                {vals.map((val, valIndex) => (
                  <Detail.Metadata.TagList.Item key={key + valIndex} text={`${val.value}: ${val.count} `} />
                ))}
              </Detail.Metadata.TagList>
            ))}
          </Detail.Metadata>
        )
      }
    />
  );
}
