import { useEffect, useState } from "react";
import { searchClub } from "../Utils/clubUtils";
import { Icon, List } from "@raycast/api";
import Club from "./ClubComponent";
import { IClubData } from "../models/IClubData";
import BadAPIKey from "./BadAPIKey";
import ClubNotFoundError from "./ClubNotFoundError";
import Unexpected from "./Unexpected";

interface IClubIdProps {
  id: string;
}

const ClubComponent = ({ id }: IClubIdProps) => {
  const [clubData, setclubData] = useState<IClubData>();

  const [error, setError] = useState<any>();

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchclubData = async () => {
      try {
        const data = await searchClub(id);
        setclubData(data);
      } catch (error) {
        setError(error);
      }
    };

    fetchclubData();
  }, []);

  if (error) {
    if (typeof error === "string") {
      if (error.includes("403")) {
        return <BadAPIKey error={error} />;
      } else if (error.includes("404")) {
        return (
          <List navigationTitle={error} onSearchTextChange={setSearchText}>
            <ClubNotFoundError searchText={searchText.replace("#", "")} />
          </List>
        );
      }
    } else {
      return (
        <List navigationTitle={error}>
          <Unexpected error={error} />
        </List>
      );
    }
  }

  if (!clubData) {
    return (
      <List onSearchTextChange={setSearchText}>
        <List.EmptyView icon={Icon.CircleProgress} title="Loading Club Data" description="Work in progress." />
      </List>
    );
  }

  return <Club clubData={clubData} />;
};
export default ClubComponent;
