import { Detail } from "@raycast/api";
import { DetailsDetailSection } from "../components/DetailSection";
import { HeadersDetails } from "../components/HeadersDetails";
import { HttpStatusDetails } from "../components/HttpStatusDetails";
import { RequestDetails } from "../components/RequestDetails";
import { Request } from "../types/request";
import { Response } from "../types/response";
import { getRenderer } from "../utils/response";

export type ResponseViewProps = {
  request: Request;
  response: Response;
};

export function ResponseView(props: Readonly<ResponseViewProps>) {
  const { request, response } = props;

  const renderer = getRenderer(response.headers?.["content-type"] || "");

  const markdown = `
# Response
${renderer(request, response)}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <DetailsDetailSection noSeparator>
            <HttpStatusDetails status={response.status} />
            <RequestDetails request={request} />
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
