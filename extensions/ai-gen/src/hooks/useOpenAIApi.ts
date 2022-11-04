import { Configuration, OpenAIApi } from "openai";
import { useCallback, useRef, useState } from "react";

import type { CreateImageRequest, ImagesResponseDataInner } from "openai";

export type ImagesResponse = {
  images?: ImagesResponseDataInner[];
  error?: Error;
};

export default function useOpenAIApi(config: { apiKey: string }, useTestData = false) {
  const [state, setState] = useState<ImagesResponse>({});
  const [isLoading, setIsLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const openai = new OpenAIApi(config as Configuration);

  const createImage = useCallback(
    async function createImage(requestOpt: CreateImageRequest) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);

      try {
        if (useTestData) {
          setState(TEST_DATA);
        } else {
          const { data } = await openai.createImage(requestOpt, {
            // There's a bug in the openai library where the auth header isn't being set
            // Set it manually here instead
            headers: { Authorization: `Bearer ${config.apiKey}` },
          });
          setState({ images: data.data });
        }
        setIsLoading(false);
      } catch (e) {
        const error = e as any;
        if (error.response) {
          setState({ error: new Error(`${error.response.status}: ${error.response.data.error.message}`) });
        } else {
          setState({ error: error.message });
        }
      }

      return () => {
        cancelRef.current?.abort();
      };
    },
    [state, cancelRef]
  );

  return [state, createImage, isLoading] as const;
}

// Every API call costs credits. So during development, it's useful to have test data to use while
// building features that doesn't drive up your credit usage. These are all illustrations of
// cats eating a pizza, because I find that hilarious.
export const TEST_DATA = {
  images: [
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-WikQgbAoui4DtxPhQsWJpFEQ.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=o59YT8d788NOGee3bM9BbmE3GSZ7nitOSQsHjZrdYGI%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-5P2mxBasS5L70T91J8quHRqu.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=FIBxlliMoM8C8igHmrA2hwDNHBjJB5t/8kKwZq1HosM%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-HBim7buuXIe6eOsXmIx8Xyad.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=oycaLjFz9TU0CD8lv5RSRe3O8ik3x3DJilViwWBmJfc%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-SgPDVSlzQFDcopx56ey4NR9h.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=LC8AjWZhohhQm6NJLIyLE4XyILYCyKo3m64OgfzRz9E%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-cTTd42Cpdbb3Yd5wapyUCtl5.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=UOyvIfbaSkknaHzheb1XxYefHJ2Le0tMI5A2rLPMnGM%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-l0P30eOMqhUOvB3ISeb3MJxO.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=B39aSHvKxSrWjJ67l4/7Kwm3CWNiC6cxhZIsaZz3Y%2Bk%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-jEMT7RtmkqVkKtHDxgwrPVCL.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=TskhHO7alDN7eR6kvsq8Ac30JggWKXTGPV%2BUSJT4XR0%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-yE88LAhTDOBIAlR5GWOmgMjc.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=jo2Got1qQslsZ7ftCYr1xAMK8ngOtd7rdhSJxoCt3Cs%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-Z658rPsMowHJfvakaUsKGmT2.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=uOoyjgmWCDfO9V9oWpk//lTvqS0t%2BdWY4vRKGekjK4E%3D",
    },
    {
      url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Ag66yYosW2KWNv4D6BtwG4WB/user-n9Qk61CywvGJyfnBCPKKkVM3/img-Kczi9pm4hhByoCzcKo1fcAuN.png?st=2022-11-04T17%3A04%3A37Z&se=2022-11-04T19%3A04%3A37Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-04T01%3A12%3A35Z&ske=2022-11-05T01%3A12%3A35Z&sks=b&skv=2021-08-06&sig=RxLislTb8rAJPfb3rBCq07QY4%2BvmBjEd7nRepTeI3SA%3D",
    },
  ],
};

export const TEST_ERROR = {
  error: "500: Something went wrong on the server",
};
