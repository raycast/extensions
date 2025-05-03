import React from "react";
import { Abbreviation } from "../types";
import { List } from "@raycast/api";

interface AbbreviationDetailProps {
  abbreviation: Abbreviation;
}

const AbbreviationDetail = ({ abbreviation }: AbbreviationDetailProps): JSX.Element => {
  return (
    <>
      <List.Item.Detail.Metadata.Label title="Transcription" text={abbreviation.transcription} />
      <List.Item.Detail.Metadata.Label title="Language" text={abbreviation.language} />
      <List.Item.Detail.Metadata.Label title="Period" text={abbreviation.period} />
    </>
  );
};

export default AbbreviationDetail;
