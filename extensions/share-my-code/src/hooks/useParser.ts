import React from "react";

const useParser = (response: string): string => {
  const convertToMarkdownCodeBlock = (text: string): string => {
    return "### Content\n``` \n" + decodeURIComponent(text) + " \n```";
  };

  const parsedData = React.useMemo(() => {
    return convertToMarkdownCodeBlock(response);
  }, [response]);

  return parsedData;
};

export default useParser;
