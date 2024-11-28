import { Detail } from "@raycast/api";
import { DetailsDetailSection } from "../components/detailSection";
import { HeadersDetails } from "../components/headersDetails";
import { HttpStatusDetails } from "../components/httpStatusDetails";
import { RequestDetails } from "../components/requestDetails";
import { Rebound, ReboundResponse } from "../types/rebound";
import { getRenderer } from "../utils/response";

export type ResponseViewProps = {
  rebound: Rebound;
  response: ReboundResponse;
};

export function ResponseView(props: ResponseViewProps) {
  const { rebound, response } = props;

  const renderer = getRenderer(response.headers["content-type"] || "");

  const markdown = `
# Response
${renderer(rebound, response)}
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
