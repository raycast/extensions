import { Detail } from "@raycast/api";
import { DetailsDetailSection } from "../components/detailSection";
import { HeadersDetails } from "../components/headersDetails";
import { HttpStatusDetails } from "../components/httpStatusDetails";
import { RequestDetails } from "../components/requestDetails";
import { Rebound, ReboundResponse } from "../types/rebound";
import { isJson } from "../utils/storage";

export type ResponseViewProps = {
  rebound: Rebound;
  response: ReboundResponse;
};

export function ResponseView(props: ResponseViewProps) {
  const { rebound, response } = props;

  const body = isJson(response.body)
    ? `\`\`\`json\n${JSON.stringify(JSON.parse(response.body), null, 2)}\n\`\`\``
    : response.body;

  const markdown = `
# Response
${body}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <DetailsDetailSection noSeparator>
            <HttpStatusDetails status={response.status} />
            <RequestDetails rebound={rebound} />
            <Detail.Metadata.Label title="Created" text={response.created.toLocaleString()} />
          </DetailsDetailSection>
          <DetailsDetailSection title="Headers">
            <HeadersDetails headers={response.headers} />
          </DetailsDetailSection>
        </Detail.Metadata>
      }
    />
  );
}
