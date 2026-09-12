import { CheckerResponse } from "@type";
import { ListItem, Formatter, ResultManager } from "@view/result";

interface DetailsProps {
  data: CheckerResponse[];
}

function getFlattedErrInfos(data: CheckerResponse[]) {
  let key = 0;
  let textLength = 0;

  const flattedErrInfos = data.flatMap((checkerResponse, index) => {
    textLength += index !== 0 ? Formatter.chunkSize : 0;
    return checkerResponse.errInfos.map((errInfo) => {
      return {
        ...errInfo,
        errorIdx: key++,
        start: errInfo.start + textLength,
        end: errInfo.end + textLength,
      };
    });
  });

  return flattedErrInfos;
}

export default function Details({ data }: DetailsProps) {
  const errInfos = getFlattedErrInfos(data);

  const combinedTextChunks = data.reduce((text, curr): string => {
    return text + curr.userText;
  }, "");

  const resultManager = new ResultManager(combinedTextChunks, errInfos);

  return (
    <>
      {errInfos.map((errInfo) => {
        return (
          <ListItem key={errInfo.errorIdx} text={combinedTextChunks} errInfo={errInfo} resultManager={resultManager} />
        );
      })}
    </>
  );
}
